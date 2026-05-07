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

    // Fetch financial data sequentially to avoid connection pool exhaustion
    const currentRevenue = await prisma.order.aggregate({
      where: { orgId, createdAt: { gte: startDate }, paymentStatus: 'paid' },
      _sum: { netAmount: true, taxAmount: true },
      _count: { _all: true },
    });

    const previousRevenue = await prisma.order.aggregate({
      where: { orgId, createdAt: { gte: previousStartDate, lt: previousEndDate }, paymentStatus: 'paid' },
      _sum: { netAmount: true },
    });

    const currentExpenses = await prisma.expense.aggregate({
      where: { orgId, expenseDate: { gte: startDate }, approvalStatus: 'approved' },
      _sum: { amount: true },
    });

    const previousExpenses = await prisma.expense.aggregate({
      where: { orgId, expenseDate: { gte: previousStartDate, lt: previousEndDate }, approvalStatus: 'approved' },
      _sum: { amount: true },
    });

    const purchaseOrderTotals = await prisma.purchaseOrder.aggregate({
      where: { orgId, createdAt: { gte: startDate } },
      _sum: { totalCost: true },
      _count: { _all: true },
    });

    const orderCounts = await prisma.order.groupBy({
      by: ['paymentStatus'],
      where: { orgId, createdAt: { gte: startDate } },
      _count: { _all: true },
      _sum: { netAmount: true },
    });

    const todayRevenue = await prisma.order.aggregate({
      where: { orgId, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }, paymentStatus: 'paid' },
      _sum: { netAmount: true },
      _count: { _all: true },
    });

    const revenueByChannel = await prisma.order.groupBy({
      by: ['channelSourceId'],
      where: { orgId, createdAt: { gte: startDate }, paymentStatus: 'paid' },
      _sum: { netAmount: true },
      _count: { _all: true },
    });

    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { orgId, expenseDate: { gte: startDate }, approvalStatus: 'approved' },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const pendingReconciliations = await prisma.dailyReconciliation.count({
      where: { orgId, status: 'pending' },
    });

    const recentTransactions = await prisma.financialTransaction.findMany({
      where: { orgId },
      orderBy: { transactionDate: 'desc' },
      take: 10,
    });

    const salaryTotals = await prisma.employee.aggregate({
      where: { orgId, status: 'active', salary: { not: null } },
      _sum: { salary: true },
      _count: { _all: true },
    });

    // Manual transactions queries
    const manualTxnsByType = await prisma.financialTransaction.groupBy({
      by: ['type'],
      where: { orgId, transactionDate: { gte: startDate } },
      _sum: { netAmount: true, amount: true, taxAmount: true },
    });

    const previousManualTxnsByType = await prisma.financialTransaction.groupBy({
      by: ['type'],
      where: { orgId, transactionDate: { gte: previousStartDate, lt: previousEndDate } },
      _sum: { netAmount: true },
    });

    const manualExpensesByCategory = await prisma.financialTransaction.groupBy({
      by: ['category'],
      where: { orgId, transactionDate: { gte: startDate }, type: 'expense' },
      _sum: { netAmount: true },
      _count: { _all: true },
    });
    
    const todayManualRevenue = await prisma.financialTransaction.aggregate({
      where: { orgId, transactionDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }, type: 'revenue' },
      _sum: { netAmount: true },
      _count: { _all: true },
    });

    // Get channel names
    const channelIds = revenueByChannel.map((r: { channelSourceId: string }) => r.channelSourceId);
    const channels = await prisma.channelSource.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true },
    });
    const channelMap = new Map(channels.map((c: { id: string; name: string }) => [c.id, c.name]));

    // Parse manual transaction data
    const manualRevenue = manualTxnsByType.find(t => t.type === 'revenue')?._sum?.netAmount ?? 0;
    const manualExpenses = manualTxnsByType.find(t => t.type === 'expense')?._sum?.netAmount ?? 0;
    const manualTax = manualTxnsByType.reduce((acc, t) => acc + (t._sum?.taxAmount ?? 0), 0);

    const prevManualRevenue = previousManualTxnsByType.find(t => t.type === 'revenue')?._sum?.netAmount ?? 0;
    const prevManualExpenses = previousManualTxnsByType.find(t => t.type === 'expense')?._sum?.netAmount ?? 0;

    // Calculate metrics
    const revenue = (currentRevenue._sum?.netAmount ?? 0) + manualRevenue;
    const prevRevenue = (previousRevenue._sum?.netAmount ?? 0) + prevManualRevenue;
    const expenses = (currentExpenses._sum?.amount ?? 0) + manualExpenses;
    const prevExpenses = (previousExpenses._sum?.amount ?? 0) + prevManualExpenses;
    const purchaseOrders = purchaseOrderTotals._sum?.totalCost ?? 0;
    const netProfit = revenue - expenses - purchaseOrders;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const taxCollected = (currentRevenue._sum?.taxAmount ?? 0) + manualTax;

    // Calculate trends
    const revenueTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseTrend = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

    // Format revenue by channel
    const channelRevenue = revenueByChannel.map((item: any) => ({
      channelId: item.channelSourceId,
      channelName: channelMap.get(item.channelSourceId) ?? 'Direct',
      revenue: item._sum?.netAmount ?? 0,
      orderCount: item._count?._all ?? item._count ?? 0,
    }));

    // Format expenses by category
    const categoryExpensesMap = new Map<string, { amount: number, count: number }>();
    
    expensesByCategory.forEach((item: any) => {
      const cat = item.category || 'uncategorized';
      categoryExpensesMap.set(cat, {
        amount: item._sum?.amount ?? 0,
        count: item._count?._all ?? 0,
      });
    });

    manualExpensesByCategory.forEach((item: any) => {
      const cat = item.category || 'uncategorized';
      const existing = categoryExpensesMap.get(cat) || { amount: 0, count: 0 };
      categoryExpensesMap.set(cat, {
        amount: existing.amount + (item._sum?.netAmount ?? 0),
        count: existing.count + (item._count?._all ?? 0),
      });
    });

    const categoryExpenses = Array.from(categoryExpensesMap.entries()).map(([category, stats]) => ({
      category,
      amount: stats.amount,
      count: stats.count,
    }));

    // Order status breakdown
    const orderStatusBreakdown = orderCounts.map((item: any) => ({
      status: item.paymentStatus,
      count: item._count?._all ?? item._count ?? 0,
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
        activeEmployees: salaryTotals._count?._all ?? 0,
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
        revenue: (todayRevenue._sum?.netAmount ?? 0) + (todayManualRevenue._sum?.netAmount ?? 0),
        orderCount: (todayRevenue._count?._all ?? 0) + (todayManualRevenue._count?._all ?? 0),
      },

      // Breakdowns
      revenueByChannel: channelRevenue,
      expensesByCategory: categoryExpenses,
      ordersByStatus: orderStatusBreakdown,

      // Counts
      counts: {
        totalOrders: currentRevenue._count?._all ?? 0,
        purchaseOrderCount: purchaseOrderTotals._count?._all ?? 0,
        pendingReconciliations,
      },

      // Recent activity
      recentTransactions: recentTransactions.map((t: { id: string; transactionNumber: string; type: string; category: string | null; amount: number; netAmount: number; description: string | null; transactionDate: Date; paymentStatus: string; isReconciled: boolean }) => ({
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
