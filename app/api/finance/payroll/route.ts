import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/finance/payroll
 * List payroll records with filtering
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission
    const canView = await hasPermission(session.user.id, 'finance.view', orgId) ||
                    await hasPermission(session.user.id, 'payroll.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Payroll view permission required.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const status = url.searchParams.get('status');
    const employeeId = url.searchParams.get('employeeId');
    const periodStart = url.searchParams.get('periodStart');
    const periodEnd = url.searchParams.get('periodEnd');

    const where: any = { orgId };

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (periodStart) {
      where.periodStart = { gte: new Date(periodStart) };
    }

    if (periodEnd) {
      where.periodEnd = { lte: new Date(periodEnd) };
    }

    const [records, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              designation: true,
              department: true,
            },
          },
        },
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payrollRecord.count({ where }),
    ]);

    // Summary stats
    const summary = await prisma.payrollRecord.aggregate({
      where: { ...where, status: 'paid' },
      _sum: {
        baseSalary: true,
        allowances: true,
        deductions: true,
        taxAmount: true,
        netSalary: true,
      },
      _count: { id: true },
    });

    return NextResponse.json({
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalBaseSalary: summary._sum?.baseSalary ?? 0,
        totalAllowances: summary._sum?.allowances ?? 0,
        totalDeductions: summary._sum?.deductions ?? 0,
        totalTax: summary._sum?.taxAmount ?? 0,
        totalNetPaid: summary._sum?.netSalary ?? 0,
        recordCount: summary._count?.id ?? 0,
      },
    });
  } catch (error) {
    console.error('[FINANCE_PAYROLL_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/payroll
 * Create payroll record for an employee
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission
    const canManage = await hasPermission(session.user.id, 'payroll.manage', orgId) ||
                      await hasPermission(session.user.id, 'finance.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Payroll management permission required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      employeeId,
      periodStart,
      periodEnd,
      baseSalary,
      allowances,
      deductions,
      taxAmount,
      paymentMethod,
      notes,
    } = body;

    // Validate required fields
    if (!employeeId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Employee ID, period start, and period end are required' },
        { status: 400 }
      );
    }

    // Verify employee exists and belongs to org
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, orgId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check for duplicate payroll for same period
    const existingPayroll = await prisma.payrollRecord.findFirst({
      where: {
        orgId,
        employeeId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    if (existingPayroll) {
      return NextResponse.json(
        { error: 'Payroll record already exists for this employee and period' },
        { status: 400 }
      );
    }

    // Calculate net salary
    const base = baseSalary || employee.salary || 0;
    const allow = parseFloat(String(allowances || 0));
    const deduct = parseFloat(String(deductions || 0));
    const tax = parseFloat(String(taxAmount || 0));
    const netSalary = base + allow - deduct - tax;

    // Generate payroll number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 7).replace(/-/g, '');
    const count = await prisma.payrollRecord.count({
      where: {
        orgId,
        payrollNumber: { startsWith: `PAY-${dateStr}` },
      },
    });
    const payrollNumber = `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const payrollRecord = await prisma.payrollRecord.create({
      data: {
        orgId,
        payrollNumber,
        employeeId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        baseSalary: base,
        allowances: allow,
        deductions: deduct,
        taxAmount: tax,
        netSalary,
        paymentMethod: paymentMethod || 'bank_transfer',
        status: 'pending',
        createdBy: session.user.id,
        notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        resource: 'payroll',
        resourceId: payrollRecord.id,
        changes: { employeeId, periodStart, periodEnd, netSalary },
        status: 'success',
      },
    });

    return NextResponse.json(payrollRecord, { status: 201 });
  } catch (error) {
    console.error('[FINANCE_PAYROLL_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create payroll record' },
      { status: 500 }
    );
  }
}
