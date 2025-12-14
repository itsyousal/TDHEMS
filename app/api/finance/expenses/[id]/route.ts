import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * PATCH /api/finance/expenses/[id]
 * Update expense status (approve/reject)
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
    const { id: expenseId } = await params;

    // Check permission - need finance.approve or finance.manage
    const canApprove = await hasPermission(session.user.id, 'finance.approve', orgId) ||
                       await hasPermission(session.user.id, 'finance.manage', orgId);
    if (!canApprove) {
      return NextResponse.json(
        { error: 'Access denied. Finance approval permission required.' },
        { status: 403 }
      );
    }

    // Get the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, rejectionReason, notes } = body;

    const validStatuses = ['pending', 'approved', 'rejected', 'paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update the expense
    const updateData: any = {
      approvalStatus: status,
      approvedBy: status === 'approved' ? session.user.id : undefined,
      approvedAt: status === 'approved' ? new Date() : undefined,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      notes: notes || expense.notes,
    };

    if (status === 'paid') {
      updateData.paidAt = new Date();
      updateData.paidBy = session.user.id;
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
    });

    // Update linked financial transaction status
    const linkedTransaction = await prisma.financialTransaction.findFirst({
      where: {
        orgId,
        referenceType: 'expense',
        referenceId: expenseId,
      },
    });

    if (linkedTransaction) {
      let paymentStatus = 'pending';
      let approvalStatus = 'pending';

      if (status === 'approved') {
        approvalStatus = 'approved';
      } else if (status === 'rejected') {
        approvalStatus = 'rejected';
        paymentStatus = 'cancelled';
      } else if (status === 'paid') {
        approvalStatus = 'approved';
        paymentStatus = 'completed';
      }

      await prisma.financialTransaction.update({
        where: { id: linkedTransaction.id },
        data: {
          approvalStatus,
          paymentStatus,
          approvedBy: status === 'approved' || status === 'paid' ? session.user.id : undefined,
          approvedAt: status === 'approved' || status === 'paid' ? new Date() : undefined,
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        resource: 'expense',
        resourceId: expenseId,
        changes: { status, previousStatus: expense.approvalStatus },
        status: 'success',
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('[FINANCE_EXPENSE_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/expenses/[id]
 * Delete expense (only if pending)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const { id: expenseId } = await params;

    // Get the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if user can delete
    const isCreator = expense.createdBy === session.user.id;
    const canManage = await hasPermission(session.user.id, 'finance.manage', orgId);

    if (!isCreator && !canManage) {
      return NextResponse.json(
        { error: 'Access denied. Only creator or finance manager can delete.' },
        { status: 403 }
      );
    }

    // Can only delete pending expenses
    if (expense.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete expense that has been processed.' },
        { status: 400 }
      );
    }

    // Delete linked financial transaction
    await prisma.financialTransaction.deleteMany({
      where: {
        orgId,
        referenceType: 'expense',
        referenceId: expenseId,
      },
    });

    // Delete the expense
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        resource: 'expense',
        resourceId: expenseId,
        changes: { category: expense.category, amount: expense.amount },
        status: 'success',
      },
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('[FINANCE_EXPENSE_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
