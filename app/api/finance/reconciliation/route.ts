import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/finance/reconciliation
 * Get reconciliation data for a specific date or today
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission
    const canView = await hasPermission(session.user.id, 'finance.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Finance view permission required.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    
    // Default to today
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Check for existing reconciliation
    const existingReconciliation = await prisma.dailyReconciliation.findUnique({
      where: {
        orgId_reconciliationDate: {
          orgId,
          reconciliationDate: startOfDay,
        },
      },
    });

    // Fetch day's financial data
    const [
      // Orders for the day
      ordersData,
      // Revenue by channel
      revenueByChannelData,
      // Expenses for the day
      expensesData,
      // Purchase orders received
      purchaseOrdersData,
      // Refunds
      refundsData,
    ] = await Promise.all([
      // All orders
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
        include: {
          channelSource: { select: { id: true, name: true } },
        },
      }),
      // Group by channel
      prisma.order.groupBy({
        by: ['channelSourceId'],
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
          paymentStatus: 'paid',
        },
        _sum: { netAmount: true, taxAmount: true },
        _count: true,
      }),
      // Expenses
      prisma.expense.findMany({
        where: {
          orgId,
          expenseDate: { gte: startOfDay, lt: endOfDay },
          approvalStatus: 'approved',
        },
      }),
      // Purchase orders
      prisma.purchaseOrder.findMany({
        where: {
          orgId,
          receivedDate: { gte: startOfDay, lt: endOfDay },
          status: 'received',
        },
        include: {
          supplier: { select: { id: true, name: true } },
        },
      }),
      // Refunds (orders with refunded payment status)
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
          paymentStatus: 'refunded',
        },
      }),
    ]);

    // Get channel names
    const channelIds = revenueByChannelData.map((r: { channelSourceId: string }) => r.channelSourceId);
    const channels = await prisma.channelSource.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true },
    });
    const channelMap = new Map(channels.map((c: { id: string; name: string }) => [c.id, c.name]));

    // Calculate totals
    const paidOrders = ordersData.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid');
    const pendingOrders = ordersData.filter((o: { paymentStatus: string }) => o.paymentStatus === 'pending');
    
    const totalRevenue = paidOrders.reduce((sum: number, o: { netAmount: number | null }) => sum + (o.netAmount || 0), 0);
    const taxCollected = paidOrders.reduce((sum: number, o: { taxAmount: number | null }) => sum + (o.taxAmount || 0), 0);
    const totalExpenses = expensesData.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
    const purchaseExpenses = purchaseOrdersData.reduce((sum: number, po: { totalCost: number }) => sum + po.totalCost, 0);
    const refundAmount = refundsData.reduce((sum: number, o: { netAmount: number | null }) => sum + (o.netAmount || 0), 0);

    // Revenue by channel with names
    const revenueByChannel: Record<string, { name: string; amount: number; orderCount: number; tax: number }> = {};
    for (const item of revenueByChannelData) {
      const channelName = channelMap.get(item.channelSourceId) ?? 'Direct';
      revenueByChannel[item.channelSourceId] = {
        name: channelName,
        amount: item._sum?.netAmount ?? 0,
        orderCount: item._count ?? 0,
        tax: item._sum?.taxAmount ?? 0,
      };
    }

    // Expense breakdown by category
    const expensesByCategory: Record<string, number> = {};
    for (const expense of expensesData) {
      const cat = expense.category || 'other';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + expense.amount;
    }

    // Get order count properly
    const orderCount = ordersData.length;
    
    const netProfit = totalRevenue - totalExpenses - purchaseExpenses - refundAmount;

    // Build summary
    const summary = {
      date: startOfDay.toISOString().split('T')[0],
      reconciliationDate: startOfDay,
      
      // Revenue
      totalRevenue,
      orderRevenue: totalRevenue,
      otherRevenue: 0,
      revenueByChannel,
      
      // Expenses
      totalExpenses: totalExpenses + purchaseExpenses,
      operatingExpenses: totalExpenses,
      purchaseExpenses,
      payrollExpenses: 0, // Would need payroll data
      otherExpenses: 0,
      expensesByCategory,
      
      // Tax
      taxCollected,
      taxPaid: 0, // From expense records
      netTax: taxCollected,
      
      // Net
      netProfit,
      
      // Counts
      totalOrders: ordersData.length,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      refundedOrders: refundsData.length,
      refundAmount,
      
      // Status
      status: existingReconciliation?.status || 'pending',
      confirmedAt: existingReconciliation?.confirmedAt || null,
      confirmedBy: existingReconciliation?.confirmedBy || null,
      
      // Variance (if previously entered)
      expectedCash: existingReconciliation?.expectedCash ?? totalRevenue,
      actualCash: existingReconciliation?.actualCash ?? null,
      cashVariance: existingReconciliation?.cashVariance ?? null,
      varianceNotes: existingReconciliation?.varianceNotes ?? null,
      
      // Orders list for detail view
      orders: ordersData.map((o: { id: string; orderNumber: string; channelSource: { name: string } | null; netAmount: number; taxAmount: number; paymentStatus: string; createdAt: Date }) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        channel: o.channelSource?.name || 'Direct',
        amount: o.netAmount,
        tax: o.taxAmount,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
      })),
      
      // Expenses list
      expenses: expensesData.map((e: { id: string; category: string | null; amount: number; description: string | null; vendor: string | null }) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        description: e.description,
        vendor: e.vendor,
      })),
      
      // Purchase orders
      purchaseOrders: purchaseOrdersData.map((po: { id: string; poNumber: string; supplier: { name: string } | null; totalCost: number; receivedDate: Date | null }) => ({
        id: po.id,
        poNumber: po.poNumber,
        supplierName: po.supplier?.name || 'Direct',
        totalCost: po.totalCost,
        receivedDate: po.receivedDate,
      })),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[FINANCE_RECONCILIATION_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/reconciliation
 * Confirm daily reconciliation
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission - require finance.reconcile for confirming
    const canReconcile = await hasPermission(session.user.id, 'finance.reconcile', orgId);
    if (!canReconcile) {
      return NextResponse.json(
        { error: 'Access denied. Finance reconcile permission required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      date,
      actualCash,
      varianceNotes,
      notes,
      // Summary data
      totalRevenue,
      orderRevenue,
      otherRevenue,
      revenueByChannel,
      totalExpenses,
      purchaseExpenses,
      operatingExpenses,
      payrollExpenses,
      otherExpenses,
      taxCollected,
      taxPaid,
      netTax,
      netProfit,
      totalOrders,
      paidOrders,
      refundedOrders,
      pendingOrders,
    } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const reconciliationDate = new Date(date);
    reconciliationDate.setHours(0, 0, 0, 0);

    // Calculate expected cash and variance
    const expectedCash = totalRevenue || 0;
    const actualCashValue = actualCash !== undefined && actualCash !== null ? parseFloat(String(actualCash)) : null;
    const cashVariance = actualCashValue !== null ? actualCashValue - expectedCash : null;

    // Upsert reconciliation record
    const reconciliation = await prisma.dailyReconciliation.upsert({
      where: {
        orgId_reconciliationDate: {
          orgId,
          reconciliationDate,
        },
      },
      update: {
        totalRevenue: totalRevenue || 0,
        orderRevenue: orderRevenue || 0,
        otherRevenue: otherRevenue || 0,
        revenueByChannel: revenueByChannel || {},
        totalExpenses: totalExpenses || 0,
        purchaseExpenses: purchaseExpenses || 0,
        operatingExpenses: operatingExpenses || 0,
        payrollExpenses: payrollExpenses || 0,
        otherExpenses: otherExpenses || 0,
        taxCollected: taxCollected || 0,
        taxPaid: taxPaid || 0,
        netTax: netTax || 0,
        netProfit: netProfit || 0,
        totalOrders: totalOrders || 0,
        paidOrders: paidOrders || 0,
        refundedOrders: refundedOrders || 0,
        pendingOrders: pendingOrders || 0,
        status: 'confirmed',
        confirmedBy: session.user.id,
        confirmedAt: new Date(),
        expectedCash,
        actualCash: actualCashValue,
        cashVariance,
        varianceNotes: varianceNotes || null,
        notes: notes || null,
      },
      create: {
        orgId,
        reconciliationDate,
        totalRevenue: totalRevenue || 0,
        orderRevenue: orderRevenue || 0,
        otherRevenue: otherRevenue || 0,
        revenueByChannel: revenueByChannel || {},
        totalExpenses: totalExpenses || 0,
        purchaseExpenses: purchaseExpenses || 0,
        operatingExpenses: operatingExpenses || 0,
        payrollExpenses: payrollExpenses || 0,
        otherExpenses: otherExpenses || 0,
        taxCollected: taxCollected || 0,
        taxPaid: taxPaid || 0,
        netTax: netTax || 0,
        netProfit: netProfit || 0,
        totalOrders: totalOrders || 0,
        paidOrders: paidOrders || 0,
        refundedOrders: refundedOrders || 0,
        pendingOrders: pendingOrders || 0,
        status: 'confirmed',
        confirmedBy: session.user.id,
        confirmedAt: new Date(),
        expectedCash,
        actualCash: actualCashValue,
        cashVariance,
        varianceNotes: varianceNotes || null,
        notes: notes || null,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        resource: 'daily_reconciliation',
        resourceId: reconciliation.id,
        changes: {
          date: reconciliationDate.toISOString().split('T')[0],
          totalRevenue,
          totalExpenses,
          netProfit,
          actualCash: actualCashValue,
          cashVariance,
        },
        status: 'success',
      },
    });

    return NextResponse.json({
      success: true,
      reconciliation: {
        id: reconciliation.id,
        date: reconciliation.reconciliationDate,
        status: reconciliation.status,
        confirmedAt: reconciliation.confirmedAt,
        netProfit: reconciliation.netProfit,
        cashVariance: reconciliation.cashVariance,
      },
    });
  } catch (error) {
    console.error('[FINANCE_RECONCILIATION_POST]', error);
    return NextResponse.json(
      { error: 'Failed to confirm reconciliation' },
      { status: 500 }
    );
  }
}
