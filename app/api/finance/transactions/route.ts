import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/finance/transactions
 * List financial transactions with filtering and pagination
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
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const type = url.searchParams.get('type'); // revenue, expense, refund, adjustment
    const category = url.searchParams.get('category');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const isReconciled = url.searchParams.get('isReconciled');
    const search = url.searchParams.get('search');

    const where: any = { orgId };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (startDate) {
      where.transactionDate = { ...where.transactionDate, gte: new Date(startDate) };
    }

    if (endDate) {
      where.transactionDate = { ...where.transactionDate, lte: new Date(endDate) };
    }

    if (isReconciled !== null && isReconciled !== undefined && isReconciled !== '') {
      where.isReconciled = isReconciled === 'true';
    }

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { channelName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialTransaction.count({ where }),
    ]);

    // Calculate summary for filtered results
    const summary = await prisma.financialTransaction.aggregate({
      where,
      _sum: { amount: true, netAmount: true, taxAmount: true },
    });

    return NextResponse.json({
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summary._sum?.amount ?? 0,
        totalNetAmount: summary._sum?.netAmount ?? 0,
        totalTax: summary._sum?.taxAmount ?? 0,
      },
    });
  } catch (error) {
    console.error('[FINANCE_TRANSACTIONS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/transactions
 * Create a manual financial transaction (for adjustments, manual entries)
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission - require finance.manage for creating transactions
    const canManage = await hasPermission(session.user.id, 'finance.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Finance manage permission required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type,
      category,
      subCategory,
      amount,
      taxAmount = 0,
      description,
      notes,
      paymentMethod,
      paymentReference,
      transactionDate,
    } = body;

    // Validate required fields
    if (!type || !category || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Type, category, and amount are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['revenue', 'expense', 'refund', 'adjustment', 'transfer'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate transaction number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.financialTransaction.count({
      where: {
        orgId,
        transactionNumber: { startsWith: `TXN-${dateStr}` },
      },
    });
    const transactionNumber = `TXN-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    // Calculate net amount
    const numericAmount = parseFloat(String(amount));
    const numericTax = parseFloat(String(taxAmount)) || 0;
    const netAmount = numericAmount + numericTax;

    const transaction = await prisma.financialTransaction.create({
      data: {
        orgId,
        transactionNumber,
        type,
        category,
        subCategory: subCategory || null,
        amount: numericAmount,
        taxAmount: numericTax,
        netAmount,
        description: description || null,
        notes: notes || null,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        paymentStatus: 'completed',
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        createdBy: session.user.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        resource: 'financial_transaction',
        resourceId: transaction.id,
        changes: { transactionNumber, type, category, amount: numericAmount },
        status: 'success',
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('[FINANCE_TRANSACTIONS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
