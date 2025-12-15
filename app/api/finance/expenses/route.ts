import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/finance/expenses
 * List expenses with filtering and pagination
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
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where: any = { orgId };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.approvalStatus = status;
    }

    if (startDate) {
      where.expenseDate = { ...where.expenseDate, gte: new Date(startDate) };
    }

    if (endDate) {
      where.expenseDate = { ...where.expenseDate, lte: new Date(endDate) };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    // Category breakdown
    const categoryBreakdown = await prisma.expense.groupBy({
      by: ['category'],
      where: { ...where, approvalStatus: 'approved' },
      _sum: { amount: true },
      _count: { id: true },
    });

    return NextResponse.json({
      data: expenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      categoryBreakdown: categoryBreakdown.map((c: { category: string | null; _sum: { amount: number | null } | null; _count: { id: number } }) => ({
        category: c.category,
        amount: c._sum?.amount ?? 0,
        count: c._count?.id ?? 0,
      })),
    });
  } catch (error) {
    console.error('[FINANCE_EXPENSES_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/expenses
 * Create a new expense
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission - expenses.create or finance.manage
    const canCreate = await hasPermission(session.user.id, 'expenses.create', orgId) ||
                      await hasPermission(session.user.id, 'finance.manage', orgId);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Access denied. Expense create permission required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      category,
      amount,
      description,
      vendor,
      paymentMethod,
      referenceNumber,
      receiptUrl,
      expenseDate,
    } = body;

    // Validate required fields
    if (!category || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Category and amount are required' },
        { status: 400 }
      );
    }

    const validCategories = [
      'raw_materials',
      'labor',
      'utilities',
      'marketing',
      'transport',
      'rent',
      'equipment',
      'maintenance',
      'supplies',
      'insurance',
      'taxes',
      'other',
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const numericAmount = parseFloat(String(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        orgId,
        category,
        amount: numericAmount,
        description: description || null,
        vendor: vendor || null,
        paymentMethod: paymentMethod || null,
        referenceNumber: referenceNumber || null,
        receiptUrl: receiptUrl || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        approvalStatus: 'pending',
        createdBy: session.user.id,
      },
    });

    // Auto-create financial transaction for the expense
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.financialTransaction.count({
      where: {
        orgId,
        transactionNumber: { startsWith: `TXN-${dateStr}` },
      },
    });
    const transactionNumber = `TXN-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    await prisma.financialTransaction.create({
      data: {
        orgId,
        transactionNumber,
        type: 'expense',
        category: 'expense',
        subCategory: category,
        amount: -numericAmount, // Negative for expenses
        netAmount: -numericAmount,
        referenceType: 'expense',
        referenceId: expense.id,
        paymentMethod: paymentMethod || null,
        paymentStatus: 'pending', // Will be updated when expense is approved
        description: description || `Expense: ${category}`,
        transactionDate: expense.expenseDate,
        createdBy: session.user.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        resource: 'expense',
        resourceId: expense.id,
        changes: { category, amount: numericAmount, vendor },
        status: 'success',
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('[FINANCE_EXPENSES_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
