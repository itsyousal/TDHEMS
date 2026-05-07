import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission - require finance.manage for editing transactions
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
      taxAmount,
      description,
      notes,
      paymentMethod,
      paymentReference,
      transactionDate,
    } = body;

    // Verify transaction exists and belongs to organization
    const existingTransaction = await prisma.financialTransaction.findFirst({
      where: {
        id: params.id,
        orgId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Calculate net amount if amount or taxAmount is provided
    let netAmount = existingTransaction.netAmount;
    const numericAmount = amount !== undefined ? parseFloat(String(amount)) : existingTransaction.amount;
    const numericTax = taxAmount !== undefined ? parseFloat(String(taxAmount)) : existingTransaction.taxAmount;
    
    if (amount !== undefined || taxAmount !== undefined) {
      netAmount = numericAmount + numericTax;
    }

    const updatedTransaction = await prisma.financialTransaction.update({
      where: { id: params.id },
      data: {
        type: type || undefined,
        category: category || undefined,
        subCategory: subCategory !== undefined ? subCategory : undefined,
        amount: numericAmount,
        taxAmount: numericTax,
        netAmount,
        description: description !== undefined ? description : undefined,
        notes: notes !== undefined ? notes : undefined,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
        paymentReference: paymentReference !== undefined ? paymentReference : undefined,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        resource: 'financial_transaction',
        resourceId: updatedTransaction.id,
        changes: body,
        status: 'success',
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('[FINANCE_TRANSACTIONS_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission - require finance.manage for deleting transactions
    const canManage = await hasPermission(session.user.id, 'finance.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Finance manage permission required.' },
        { status: 403 }
      );
    }

    // Verify transaction exists and belongs to organization
    const existingTransaction = await prisma.financialTransaction.findFirst({
      where: {
        id: params.id,
        orgId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.financialTransaction.delete({
      where: { id: params.id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        resource: 'financial_transaction',
        resourceId: params.id,
        changes: { transactionNumber: existingTransaction.transactionNumber },
        status: 'success',
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[FINANCE_TRANSACTIONS_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
