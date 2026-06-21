import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

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

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
