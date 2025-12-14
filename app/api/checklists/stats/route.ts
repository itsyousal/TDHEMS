import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/checklists/stats
 * Get checklist statistics for dashboard
 */
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const canView = await hasPermission(userId, 'checklists.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Checklists view permission required.' },
        { status: 403 }
      );
    }

    // Date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(today);
    monthStart.setDate(1);

    // Parallel queries for performance
    const [
      totalChecklists,
      activeChecklists,
      checklistsByFrequency,
      todayRuns,
      weekRuns,
      monthRuns,
      recentRuns,
      overdueRuns,
      upcomingChecklists,
    ] = await Promise.all([
      // Total checklists
      prisma.checklist.count({ where: { orgId } }),
      
      // Active checklists
      prisma.checklist.count({ where: { orgId, isActive: true } }),
      
      // Checklists by frequency
      prisma.checklist.groupBy({
        by: ['frequency'],
        where: { orgId, isActive: true },
        _count: true,
      }),
      
      // Today's runs
      prisma.checklistRun.findMany({
        where: {
          checklist: { orgId },
          startedAt: { gte: today, lt: tomorrow },
        },
        include: {
          checklist: { select: { id: true, name: true, frequency: true } },
          evidence: { select: { checked: true } },
        },
      }),
      
      // This week's runs
      prisma.checklistRun.findMany({
        where: {
          checklist: { orgId },
          startedAt: { gte: weekStart },
        },
        include: {
          checklist: { select: { _count: { select: { items: true } } } },
          evidence: { select: { checked: true } },
        },
      }),
      
      // This month's runs
      prisma.checklistRun.count({
        where: {
          checklist: { orgId },
          startedAt: { gte: monthStart },
        },
      }),
      
      // Recent completed runs
      prisma.checklistRun.findMany({
        where: {
          checklist: { orgId },
          status: 'completed',
        },
        include: {
          checklist: { select: { id: true, name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),
      
      // Overdue runs (in_progress started before today)
      prisma.checklistRun.count({
        where: {
          checklist: { orgId },
          status: 'in_progress',
          startedAt: { lt: today },
        },
      }),
      
      // Upcoming/due checklists for today
      prisma.checklist.findMany({
        where: {
          orgId,
          isActive: true,
          OR: [
            { frequency: 'daily' },
            // Weekly checklists due today
            {
              frequency: 'weekly',
              // Note: You might want to add a dueDay field for weekly scheduling
            },
          ],
        },
        include: {
          _count: { select: { items: true } },
          runs: {
            where: { startedAt: { gte: today } },
            take: 1,
          },
        },
        take: 10,
      }),
    ]);

    // Process today's completion stats
    const todayStats = {
      total: todayRuns.length,
      completed: todayRuns.filter((r) => r.status === 'completed').length,
      inProgress: todayRuns.filter((r) => r.status === 'in_progress').length,
      failed: todayRuns.filter((r) => r.status === 'failed').length,
    };

    // Calculate week completion rate
    const weekCompletedItems = weekRuns.reduce((acc, run) => {
      return acc + run.evidence.filter((e) => e.checked).length;
    }, 0);
    const weekTotalItems = weekRuns.reduce((acc, run) => {
      return acc + run.checklist._count.items;
    }, 0);
    const weekCompletionRate = weekTotalItems > 0 
      ? Math.round((weekCompletedItems / weekTotalItems) * 100) 
      : 0;

    // Format frequency distribution
    const frequencyDistribution = {
      daily: checklistsByFrequency.find((f) => f.frequency === 'daily')?._count || 0,
      weekly: checklistsByFrequency.find((f) => f.frequency === 'weekly')?._count || 0,
      monthly: checklistsByFrequency.find((f) => f.frequency === 'monthly')?._count || 0,
    };

    // Determine which checklists still need to be done today
    const pendingToday = upcomingChecklists.filter((c) => c.runs.length === 0);

    return NextResponse.json({
      overview: {
        totalChecklists,
        activeChecklists,
        overdueRuns,
        monthlyRuns: monthRuns,
      },
      today: {
        ...todayStats,
        completionRate: todayStats.total > 0 
          ? Math.round((todayStats.completed / todayStats.total) * 100) 
          : 0,
        pendingCount: pendingToday.length,
      },
      thisWeek: {
        totalRuns: weekRuns.length,
        completionRate: weekCompletionRate,
        completedRuns: weekRuns.filter((r) => r.status === 'completed').length,
      },
      frequencyDistribution,
      recentCompletions: recentRuns.map((run) => ({
        id: run.id,
        checklistName: run.checklist.name,
        completedBy: `${run.user.firstName} ${run.user.lastName}`,
        completedAt: run.completedAt,
      })),
      pendingToday: pendingToday.map((c) => ({
        id: c.id,
        name: c.name,
        itemCount: c._count.items,
      })),
    });
  } catch (error) {
    console.error('[CHECKLIST_STATS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist statistics' },
      { status: 500 }
    );
  }
}
