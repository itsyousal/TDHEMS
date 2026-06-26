import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

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

    // Get date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // Use aggregate queries instead of loading all order rows into memory.
    const [todayAggregate, todayStatusCounts, yesterdayAggregate, yesterdayStatusCounts] = await Promise.all([
      prisma.order.aggregate({
        where: {
          orgId: userOrg,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: {
            not: 'cancelled',
          },
        },
        _sum: { netAmount: true },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where: {
          orgId: userOrg,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: {
            not: 'cancelled',
          },
        },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: {
          orgId: userOrg,
          createdAt: {
            gte: yesterdayStart,
            lte: yesterdayEnd,
          },
          status: {
            not: 'cancelled',
          },
        },
        _sum: { netAmount: true },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where: {
          orgId: userOrg,
          createdAt: {
            gte: yesterdayStart,
            lte: yesterdayEnd,
          },
          status: {
            not: 'cancelled',
          },
        },
        _count: { _all: true },
      }),
    ]);

    const todayTotal = todayAggregate._sum?.netAmount ?? 0;
    const yesterdayTotal = yesterdayAggregate._sum?.netAmount ?? 0;
    const todayPaid = todayStatusCounts.find((item) => item.paymentStatus === 'paid')?._count?._all ?? 0;
    const todayPending = todayStatusCounts.find((item) => item.paymentStatus === 'pending')?._count?._all ?? 0;
    const yesterdayPaid = yesterdayStatusCounts.find((item) => item.paymentStatus === 'paid')?._count?._all ?? 0;
    const yesterdayPending = yesterdayStatusCounts.find((item) => item.paymentStatus === 'pending')?._count?._all ?? 0;

    // Calculate change percentage
    const changePercentage = yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
      : todayTotal > 0 ? 100 : 0;

    return NextResponse.json({
      today: {
        total: todayTotal,
        orders: todayAggregate._count?._all ?? 0,
        paid: todayPaid,
        pending: todayPending,
      },
      yesterday: {
        total: yesterdayTotal,
        orders: yesterdayAggregate._count?._all ?? 0,
        paid: yesterdayPaid,
        pending: yesterdayPending,
      },
      change: {
        amount: todayTotal - yesterdayTotal,
        percentage: changePercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales summary' },
      { status: 500 }
    );
  }
}
