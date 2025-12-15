import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/checklists/analytics
 * Get detailed analytics and logs for checklists
 * Access: checklists.manage permission required (super admin only)
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    // Only allow users with checklists.manage permission
    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Analytics requires admin permissions.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'overview';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const checklistId = url.searchParams.get('checklistId');
    const employeeId = url.searchParams.get('employeeId');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Date range filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Build where clause for runs
    const runWhere: any = {
      checklist: { orgId },
    };
    if (Object.keys(dateFilter).length > 0) {
      runWhere.startedAt = dateFilter;
    }
    if (checklistId) {
      runWhere.checklistId = checklistId;
    }
    if (employeeId) {
      runWhere.userId = employeeId;
    }
    if (status) {
      runWhere.status = status;
    }

    switch (type) {
      case 'overview': {
        // Get overview metrics
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now);
        monthStart.setDate(1);

        const [
          totalRuns,
          completedRuns,
          overdueRuns,
          todayRuns,
          weeklyRuns,
          monthlyRuns,
          avgCompletionTime,
          topPerformers,
          checklistBreakdown,
        ] = await Promise.all([
          // Total runs
          prisma.checklistRun.count({ where: { checklist: { orgId } } }),
          // Completed runs
          prisma.checklistRun.count({ where: { checklist: { orgId }, status: 'completed' } }),
          // Overdue runs
          prisma.checklistRun.count({ where: { checklist: { orgId }, status: 'overdue' } }),
          // Today's runs
          prisma.checklistRun.count({
            where: { checklist: { orgId }, startedAt: { gte: todayStart } },
          }),
          // This week's runs
          prisma.checklistRun.count({
            where: { checklist: { orgId }, startedAt: { gte: weekStart } },
          }),
          // This month's runs
          prisma.checklistRun.count({
            where: { checklist: { orgId }, startedAt: { gte: monthStart } },
          }),
          // Average completion time (completed runs only)
          prisma.checklistRun.findMany({
            where: {
              checklist: { orgId },
              status: 'completed',
              completedAt: { not: null },
            },
            select: { startedAt: true, completedAt: true },
            take: 100,
            orderBy: { completedAt: 'desc' },
          }),
          // Top performers (by completed runs)
          prisma.checklistRun.groupBy({
            by: ['userId'],
            where: { checklist: { orgId }, status: 'completed' },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
          }),
          // Checklist breakdown
          prisma.checklistRun.groupBy({
            by: ['checklistId'],
            where: { checklist: { orgId } },
            _count: { id: true },
          }),
        ]);

        // Calculate average completion time in minutes
        let avgTime = 0;
        if (avgCompletionTime.length > 0) {
          const times = avgCompletionTime
            .filter((r: { completedAt: Date | null; startedAt: Date }) => r.completedAt)
            .map((r: { completedAt: Date | null; startedAt: Date }) => (new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime()) / 60000);
          avgTime = times.length > 0 ? Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length) : 0;
        }

        // Get user details for top performers
        const performerIds = topPerformers.map((p: { userId: string }) => p.userId);
        const performers = await prisma.user.findMany({
          where: { id: { in: performerIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

        const topPerformersWithNames = topPerformers.map((p: { userId: string; _count: { id: number } }) => {
          const user = performers.find((u: { id: string }) => u.id === p.userId);
          return {
            userId: p.userId,
            name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            email: user?.email,
            completedCount: p._count.id,
          };
        });

        // Get checklist names for breakdown
        const checklistIds = checklistBreakdown.map((c) => c.checklistId);
        const checklists = await prisma.checklist.findMany({
          where: { id: { in: checklistIds } },
          select: { id: true, name: true, frequency: true },
        });

        const checklistBreakdownWithNames = checklistBreakdown.map((c: { checklistId: string; _count: { id: number } }) => {
          const checklist = checklists.find((ch: { id: string }) => ch.id === c.checklistId);
          return {
            checklistId: c.checklistId,
            name: checklist?.name || 'Unknown',
            frequency: checklist?.frequency,
            runCount: c._count.id,
          };
        });

        return NextResponse.json({
          overview: {
            totalRuns,
            completedRuns,
            overdueRuns,
            failedRuns: totalRuns - completedRuns - overdueRuns,
            completionRate: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0,
            todayRuns,
            weeklyRuns,
            monthlyRuns,
            avgCompletionTimeMinutes: avgTime,
          },
          topPerformers: topPerformersWithNames,
          checklistBreakdown: checklistBreakdownWithNames.sort((a, b) => b.runCount - a.runCount),
        });
      }

      case 'history': {
        // Get paginated run history
        const [runs, total] = await Promise.all([
          prisma.checklistRun.findMany({
            where: runWhere,
            include: {
              checklist: { select: { id: true, name: true, frequency: true } },
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
              evidence: {
                select: { id: true, checked: true, itemId: true },
              },
            },
            orderBy: { startedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.checklistRun.count({ where: runWhere }),
        ]);

        // Calculate progress for each run
        const runsWithProgress = runs.map((run: { evidence: any[]; completedAt: Date | null; startedAt: Date; [key: string]: any }) => {
          const totalItems = run.evidence.length;
          const checkedItems = run.evidence.filter((e: { checked: boolean }) => e.checked).length;
          const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
          
          // Calculate duration
          let durationMinutes = null;
          if (run.completedAt) {
            durationMinutes = Math.round(
              (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 60000
            );
          }

          return {
            id: run.id,
            checklist: run.checklist,
            user: {
              id: run.user.id,
              name: `${run.user.firstName} ${run.user.lastName}`,
              email: run.user.email,
            },
            status: run.status,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            durationMinutes,
            progress,
            itemsCompleted: checkedItems,
            totalItems,
            notes: run.notes,
          };
        });

        return NextResponse.json({
          data: runsWithProgress,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      case 'employee-performance': {
        // Get all employees who have run checklists
        const employeeRuns = await prisma.checklistRun.groupBy({
          by: ['userId'],
          where: { checklist: { orgId } },
          _count: { id: true },
        });

        const employeeIds = employeeRuns.map((e: { userId: string }) => e.userId);
        
        const [employees, completedByEmployee, overdueByEmployee] = await Promise.all([
          prisma.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          }),
          prisma.checklistRun.groupBy({
            by: ['userId'],
            where: { checklist: { orgId }, status: 'completed' },
            _count: { id: true },
          }),
          prisma.checklistRun.groupBy({
            by: ['userId'],
            where: { checklist: { orgId }, status: 'overdue' },
            _count: { id: true },
          }),
        ]);

        const performanceData = employeeIds.map((empId: string) => {
          const employee = employees.find((e: { id: string }) => e.id === empId);
          const totalRuns = employeeRuns.find((e: { userId: string; _count: { id: number } }) => e.userId === empId)?._count.id || 0;
          const completed = completedByEmployee.find((e: { userId: string; _count: { id: number } }) => e.userId === empId)?._count.id || 0;
          const overdue = overdueByEmployee.find((e: { userId: string; _count: { id: number } }) => e.userId === empId)?._count.id || 0;

          return {
            userId: empId,
            name: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
            email: employee?.email,
            totalRuns,
            completedRuns: completed,
            overdueRuns: overdue,
            inProgressRuns: totalRuns - completed - overdue,
            completionRate: totalRuns > 0 ? Math.round((completed / totalRuns) * 100) : 0,
          };
        });

        return NextResponse.json({
          data: performanceData.sort((a, b) => b.totalRuns - a.totalRuns),
        });
      }

      case 'trends': {
        // Get daily completion trends for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const runs = await prisma.checklistRun.findMany({
          where: {
            checklist: { orgId },
            startedAt: { gte: thirtyDaysAgo },
          },
          select: {
            startedAt: true,
            status: true,
          },
        });

        // Group by date
        const dailyData: Record<string, { total: number; completed: number; overdue: number }> = {};
        
        runs.forEach((run: { startedAt: Date; status: string }) => {
          const dateKey = new Date(run.startedAt).toISOString().split('T')[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { total: 0, completed: 0, overdue: 0 };
          }
          dailyData[dateKey].total++;
          if (run.status === 'completed') dailyData[dateKey].completed++;
          if (run.status === 'overdue') dailyData[dateKey].overdue++;
        });

        const trends = Object.entries(dailyData)
          .map(([date, data]: [string, { total: number; completed: number; overdue: number }]) => ({
            date,
            ...data,
            completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ trends });
      }

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[CHECKLISTS_ANALYTICS]', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
