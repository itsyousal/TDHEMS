import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

// GET - Get automation statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userOrg = user.userRoles[0]?.orgId;
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get active rules count
    const activeRulesCount = await prisma.automationRule.count({
      where: {
        orgId: userOrg,
        isActive: true,
      },
    });

    // Get total rules count (workflows)
    const totalRulesCount = await prisma.automationRule.count({
      where: { orgId: userOrg },
    });

    // Get today's executions
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const executionsToday = await prisma.automationExecution.count({
      where: {
        rule: {
          orgId: userOrg,
        },
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    // Calculate success rate (last 100 executions)
    const recentExecutions = await prisma.automationExecution.findMany({
      where: {
        rule: {
          orgId: userOrg,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const successCount = recentExecutions.filter(e => e.status === 'success').length;
    const successRate = recentExecutions.length > 0
      ? Math.round((successCount / recentExecutions.length) * 100)
      : 0;

    return NextResponse.json({
      activeRules: activeRulesCount,
      workflows: totalRulesCount,
      executionsToday,
      successRate: `${successRate}%`,
    });
  } catch (error) {
    console.error('Error fetching automation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation stats' },
      { status: 500 }
    );
  }
}
