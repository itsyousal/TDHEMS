import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { cacheDelPrefix } from '@/lib/cache';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const resolvedParams = await context.params;
    const { orderId } = resolvedParams;
    const payload = (await request.json()) as {
      status?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      paymentReference?: string;
      transactionDate?: string | null;
      discountAmount?: number | null;
      taxAmount?: number | null;
      items?: Array<{ skuId: string; quantity: number; unitPrice: number; notes?: string }>;
    };

    if (!payload.status && !payload.paymentStatus && payload.discountAmount === undefined && payload.taxAmount === undefined && !payload.items) {
      return NextResponse.json(
        { error: 'At least one editable field is required' },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder || existingOrder.orgId !== orgId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If items are provided, normalize and update totals inside a transaction
    let updatedOrder;
    if (payload.items) {
      const normalizedItems = payload.items
        .map((it: any) => {
          if (!it?.skuId || !it.quantity || !it.unitPrice) return null;
          const q = Number(it.quantity);
          const up = Number(it.unitPrice);
          if (q <= 0 || up <= 0) return null;
          return {
            skuId: it.skuId,
            quantity: q,
            unitPrice: up,
            totalPrice: Number((q * up).toFixed(2)),
            notes: it.notes?.trim() || undefined,
          };
        })
        .filter(Boolean) as Array<any>;

      const computedTotal = normalizedItems.reduce((s, it) => s + it.totalPrice, 0);
      const sanitizedDiscount = Math.max(0, Number(payload.discountAmount ?? existingOrder.discountAmount ?? 0));
      // Use payload.taxAmount if provided; otherwise keep the existing order taxAmount (do not use constants)
      const computedTax = payload.taxAmount !== undefined && payload.taxAmount !== null
        ? Number(payload.taxAmount)
        : Number(existingOrder.taxAmount || 0);
      const netAmount = Math.max(computedTotal + computedTax - sanitizedDiscount, 0);

      updatedOrder = await prisma.$transaction(async (tx) => {
        const u = await tx.order.update({
          where: { id: orderId },
          data: {
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
            totalAmount: computedTotal,
            taxAmount: computedTax,
            discountAmount: sanitizedDiscount,
            netAmount,
            items: {
              deleteMany: {},
              create: normalizedItems,
            },
          },
          include: {
            customer: true,
            channelSource: true,
            items: { include: { sku: true } },
          },
        });

        return u;
      });
    } else {
      // Partial update: status, paymentStatus, discount/tax only
      const data: any = {};
      if (payload.status) data.status = payload.status;
      if (payload.paymentStatus) data.paymentStatus = payload.paymentStatus;
      if (payload.discountAmount !== undefined) data.discountAmount = payload.discountAmount;
      if (payload.taxAmount !== undefined) data.taxAmount = payload.taxAmount;

      // If discount/tax changed, recompute netAmount based on existing totalAmount
      if (data.discountAmount !== undefined || data.taxAmount !== undefined) {
        const total = existingOrder.totalAmount || 0;
        const discount = data.discountAmount !== undefined ? Number(data.discountAmount) : existingOrder.discountAmount || 0;
        const tax = data.taxAmount !== undefined ? Number(data.taxAmount) : existingOrder.taxAmount || 0;
        data.netAmount = Math.max(total + tax - Math.max(0, discount), 0);
      }

      // If payment status changed to paid, update/create the related financial transaction
      if (data.paymentStatus === 'paid') {
        // perform update and transaction upsert atomically
        updatedOrder = await prisma.$transaction(async (tx) => {
          const u = await tx.order.update({
            where: { id: orderId },
            data,
            include: {
              customer: true,
              channelSource: true,
              items: { include: { sku: true } },
            },
          });

          // Find existing financial transaction for this order
          const existingTxn = await tx.financialTransaction.findFirst({
            where: { orgId, referenceType: 'order', referenceId: orderId },
          });

          const txnDate = payload.transactionDate ? new Date(payload.transactionDate) : new Date();
          const paymentMethod = payload.paymentMethod || 'cash';

          if (existingTxn) {
            await tx.financialTransaction.update({
              where: { id: existingTxn.id },
              data: {
                paymentMethod,
                paymentStatus: 'completed',
                paymentReference: payload.paymentReference || existingTxn.paymentReference,
                transactionDate: txnDate,
              },
            });
          } else {
            // create a minimal financial transaction linked to this order
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.floor(Math.random() * 900 + 100);
            const transactionNumber = `TXN-${dateStr}-${Date.now()}-${rand}`;
            await tx.financialTransaction.create({
              data: {
                orgId,
                transactionNumber,
                type: 'revenue',
                category: 'sales',
                subCategory: u.channelSource?.name || 'order',
                amount: u.netAmount,
                taxAmount: u.taxAmount || 0,
                netAmount: u.netAmount,
                referenceType: 'order',
                referenceId: u.id,
                paymentMethod,
                paymentStatus: 'completed',
                paymentReference: payload.paymentReference || null,
                description: `Order ${u.orderNumber} - ${u.customer?.name || 'Guest'}`,
                transactionDate: txnDate,
                createdBy: session.user.id,
                approvalStatus: 'approved',
              },
            });
          }

          return u;
        });
      } else {
        updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data,
          include: {
            customer: true,
            channelSource: true,
            items: { include: { sku: true } },
          },
        });
      }
    }

    // Invalidate finance caches for this org asynchronously
    cacheDelPrefix(`finance:${orgId}:`).catch((err) => console.warn('cacheDelPrefix failed', err));

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
