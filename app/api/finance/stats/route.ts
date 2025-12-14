import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/finance/stats
 * Fetches comprehensive financial statistics
 * Requires finance.view permission
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission for sensitive financial data
    const canViewFinance = await hasPermission(session.user.id, 'finance.view', orgId);
    if (!canViewFinance) {
      return NextResponse.json(
        { error: 'Access denied. Finance view permission required.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month'; // day, week, month, quarter, year

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 3);
        previousEndDate = new Date(startDate);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(startDate);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(startDate);
    }

    // Fetch all financial data in parallel
    const [
      // Current period revenue from orders
      currentRevenue,
      // Previous period revenue for comparison
      previousRevenue,
      // Current period expenses
      currentExpenses,
      // Previous period expenses
      previousExpenses,
      // Purchase orders totals
      purchaseOrderTotals,
      // Order counts by status
      orderCounts,
      // Today's revenue for daily view
      todayRevenue,
      // Revenue by channel
      revenueByChannel,
      // Expense breakdown by category
      expensesByCategory,
      // Pending reconciliations count
      pendingReconciliations,
      // Recent transactions
      recentTransactions,
      // Employee salary totals (for payroll insight)
      salaryTotals,
    ] = await Promise.all([
      // Current revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: 'paid',
        },
        _sum: { netAmount: true, taxAmount: true },
        _count: true,
      }),
      // Previous revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: previousStartDate, lt: previousEndDate },
          paymentStatus: 'paid',
        },
        _sum: { netAmount: true },
      }),
      // Current expenses
      prisma.expense.aggregate({
        where: {
          orgId,
          expenseDate: { gte: startDate },
          approvalStatus: 'approved',
        },
        _sum: { amount: true },
      }),
      // Previous expenses
      prisma.expense.aggregate({
        where: {
          orgId,
          expenseDate: { gte: previousStartDate, lt: previousEndDate },
          approvalStatus: 'approved',
        },
        _sum: { amount: true },
      }),
      // Purchase order totals
      prisma.purchaseOrder.aggregate({
        where: {
          orgId,
          createdAt: { gte: startDate },
        },
        _sum: { totalCost: true },
        _count: true,
      }),
      // Order counts
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
        _sum: { netAmount: true },
      }),
      // Today's revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
          paymentStatus: 'paid',
        },
        _sum: { netAmount: true },
        _count: true,
      }),
      // Revenue by channel
      prisma.order.groupBy({
        by: ['channelSourceId'],
        where: {
          createdAt: { gte: startDate },
          paymentStatus: 'paid',
        },
        _sum: { netAmount: true },
        _count: true,
      }),
      // Expenses by category
      prisma.expense.groupBy({
        by: ['category'],
        where: {
          orgId,
          expenseDate: { gte: startDate },
          approvalStatus: 'approved',
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Pending reconciliations
      prisma.dailyReconciliation.count({
        where: {
          orgId,
          status: 'pending',
        },
      }),
      // Recent transactions
      prisma.financialTransaction.findMany({
        where: { orgId },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
      // Salary totals
      prisma.employee.aggregate({
        where: {
          orgId,
          status: 'active',
          salary: { not: null },
        },
        _sum: { salary: true },
        _count: true,
      }),
    ]);

    // Get channel names
    const channelIds = revenueByChannel.map((r) => r.channelSourceId);
    const channels = await prisma.channelSource.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true },
    });
    const channelMap = new Map(channels.map((c) => [c.id, c.name]));

    // Calculate metrics
    const revenue = currentRevenue._sum?.netAmount ?? 0;
    const prevRevenue = previousRevenue._sum?.netAmount ?? 0;
    const expenses = currentExpenses._sum?.amount ?? 0;
    const prevExpenses = previousExpenses._sum?.amount ?? 0;
    const purchaseOrders = purchaseOrderTotals._sum?.totalCost ?? 0;
    const netProfit = revenue - expenses - purchaseOrders;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const taxCollected = currentRevenue._sum?.taxAmount ?? 0;

    // Calculate trends
    const revenueTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseTrend = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

    // Format revenue by channel
    const channelRevenue = revenueByChannel.map((item) => ({
      channelId: item.channelSourceId,
      channelName: channelMap.get(item.channelSourceId) ?? 'Direct',
      revenue: item._sum?.netAmount ?? 0,
      orderCount: item._count ?? 0,
    }));

    // Format expenses by category
    const categoryExpenses = expensesByCategory.map((item) => ({
      category: item.category,
      amount: item._sum?.amount ?? 0,
      count: item._count ?? 0,
    }));

    // Order status breakdown
    const orderStatusBreakdown = orderCounts.map((item) => ({
      status: item.paymentStatus,
      count: item._count ?? 0,
      amount: item._sum?.netAmount ?? 0,
    }));

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      
      // Summary stats
      summary: {
        totalRevenue: revenue,
        totalExpenses: expenses + purchaseOrders,
        purchaseOrders,
        operatingExpenses: expenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        taxCollected,
        estimatedMonthlyPayroll: salaryTotals._sum?.salary ?? 0,
        activeEmployees: salaryTotals._count ?? 0,
      },

      // Trends
      trends: {
        revenueTrend: Math.round(revenueTrend * 100) / 100,
        expenseTrend: Math.round(expenseTrend * 100) / 100,
        revenueDirection: revenueTrend >= 0 ? 'up' : 'down',
        expenseDirection: expenseTrend >= 0 ? 'up' : 'down',
      },

      // Today's snapshot
      today: {
        revenue: todayRevenue._sum?.netAmount ?? 0,
        orderCount: todayRevenue._count ?? 0,
      },

      // Breakdowns
      revenueByChannel: channelRevenue,
      expensesByCategory: categoryExpenses,
      ordersByStatus: orderStatusBreakdown,

      // Counts
      counts: {
        totalOrders: currentRevenue._count ?? 0,
        purchaseOrderCount: purchaseOrderTotals._count ?? 0,
        pendingReconciliations,
      },

      // Recent activity
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        type: t.type,
        category: t.category,
        amount: t.amount,
        netAmount: t.netAmount,
        description: t.description,
        transactionDate: t.transactionDate,
        paymentStatus: t.paymentStatus,
        isReconciled: t.isReconciled,
      })),
    });
  } catch (error) {
    console.error('[FINANCE_STATS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial statistics' },
      { status: 500 }
    );
  }
}
