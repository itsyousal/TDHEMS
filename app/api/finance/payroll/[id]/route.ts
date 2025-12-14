import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * PATCH /api/finance/payroll/[id]
 * Update payroll record status (process/pay)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const { id: payrollId } = await params;

    // Check permission
    const canManage = await hasPermission(session.user.id, 'payroll.manage', orgId) ||
                      await hasPermission(session.user.id, 'finance.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Payroll management permission required.' },
        { status: 403 }
      );
    }

    // Get the payroll record
    const payroll = await prisma.payrollRecord.findUnique({
      where: { id: payrollId },
      include: { employee: true },
    });

    if (!payroll || payroll.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Payroll record not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, paymentDate, paymentReference, notes } = body;

    const validStatuses = ['pending', 'processed', 'paid', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      status,
      notes: notes || payroll.notes,
    };

    if (status === 'processed') {
      updateData.processedBy = session.user.id;
      updateData.processedAt = new Date();
    }

    if (status === 'paid') {
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      updateData.paymentReference = paymentReference || null;
      updateData.paidBy = session.user.id;
    }

    const updatedPayroll = await prisma.payrollRecord.update({
      where: { id: payrollId },
      data: updateData,
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

    // Create financial transaction when payroll is paid
    if (status === 'paid' && payroll.status !== 'paid') {
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
          type: 'payroll',
          category: 'payroll',
          subCategory: 'salary',
          amount: -payroll.netSalary, // Negative for outflow
          taxAmount: -payroll.taxAmount,
          netAmount: -payroll.netSalary,
          referenceType: 'payroll',
          referenceId: payrollId,
          paymentMethod: payroll.paymentMethod,
          paymentStatus: 'completed',
          description: `Salary payment to ${payroll.employee.firstName} ${payroll.employee.lastName} for ${payroll.periodStart.toISOString().slice(0, 10)} to ${payroll.periodEnd.toISOString().slice(0, 10)}`,
          transactionDate: updateData.paymentDate || new Date(),
          createdBy: session.user.id,
          approvalStatus: 'approved',
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        resource: 'payroll',
        resourceId: payrollId,
        changes: { 
          status, 
          previousStatus: payroll.status,
          employeeId: payroll.employeeId,
        },
        status: 'success',
      },
    });

    return NextResponse.json(updatedPayroll);
  } catch (error) {
    console.error('[FINANCE_PAYROLL_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update payroll record' },
      { status: 500 }
    );
  }
}
