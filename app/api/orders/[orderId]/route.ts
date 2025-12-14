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
    };

    if (!payload.status && !payload.paymentStatus) {
      return NextResponse.json(
        { error: 'Status or payment status required' },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder || existingOrder.orgId !== orgId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
      },
      include: {
        customer: true,
        channelSource: true,
        items: {
          include: { sku: true },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
