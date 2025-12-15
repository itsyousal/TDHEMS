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

    // Get today's sales
    const todayOrders = await prisma.order.findMany({
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
      select: {
        netAmount: true,
        status: true,
        paymentStatus: true,
      },
    });

    // Get yesterday's sales
    const yesterdayOrders = await prisma.order.findMany({
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
      select: {
        netAmount: true,
        status: true,
        paymentStatus: true,
      },
    });

    // Calculate totals
    const todayTotal = todayOrders.reduce((sum, order) => sum + order.netAmount, 0);
    const yesterdayTotal = yesterdayOrders.reduce((sum, order) => sum + order.netAmount, 0);
    
    const todayPaid = todayOrders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid').length;
    const todayPending = todayOrders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'pending').length;

    const yesterdayPaid = yesterdayOrders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid').length;
    const yesterdayPending = yesterdayOrders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'pending').length;

    // Calculate change percentage
    const changePercentage = yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
      : todayTotal > 0 ? 100 : 0;

    return NextResponse.json({
      today: {
        total: todayTotal,
        orders: todayOrders.length,
        paid: todayPaid,
        pending: todayPending,
      },
      yesterday: {
        total: yesterdayTotal,
        orders: yesterdayOrders.length,
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
