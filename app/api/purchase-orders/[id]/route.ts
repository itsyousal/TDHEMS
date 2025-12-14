import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/purchase-orders/[id]
 * Get a specific purchase order
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const { id: poId } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId },
      include: {
        supplier: true,
        items: {
          include: { sku: true },
        },
        location: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error('[PURCHASE_ORDER_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/purchase-orders/[id]
 * Update purchase order status (receive, cancel, etc.)
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
    const { id: poId } = await params;

    // Check permission
    const canUpdate = await hasPermission(session.user.id, 'purchases.edit', orgId) ||
                      await hasPermission(session.user.id, 'inventory.edit', orgId);
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Access denied. Purchase order edit permission required.' },
        { status: 403 }
      );
    }

    // Get the purchase order
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: poId, orgId },
      include: {
        items: { include: { sku: true } },
        supplier: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      status,
      receivedItems, // Array of { itemId, receivedQuantity } for partial receiving
      notes,
      paymentStatus,
      paymentReference,
    } = body;

    const validStatuses = ['pending', 'approved', 'shipped', 'received', 'cancelled', 'partial'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      notes: notes || purchaseOrder.notes,
    };

    if (status) {
      updateData.status = status;
    }

    // Handle receiving items
    if (status === 'received' || status === 'partial') {
      updateData.receivedDate = new Date();
      updateData.receivedBy = session.user.id;

      // Process inventory updates
      await prisma.$transaction(async (tx) => {
        // Default: receive all items at full quantity if no specific items provided
        const itemsToReceive = receivedItems || purchaseOrder.items.map((item) => ({
          itemId: item.id,
          receivedQuantity: item.quantity,
        }));

        for (const received of itemsToReceive) {
          const poItem = purchaseOrder.items.find((i) => i.id === received.itemId);
          if (!poItem) continue;

          const receivedQty = parseFloat(String(received.receivedQuantity || 0));
          const previousReceived = poItem.receivedQuantity || 0;
          const newReceived = Math.min(receivedQty, poItem.quantity);
          const quantityToAdd = newReceived - previousReceived;

          if (quantityToAdd > 0) {
            // Update PO item
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: {
                receivedQuantity: newReceived,
                variance: poItem.quantity - newReceived,
              },
            });

            // Update inventory
            let inventory = await tx.inventory.findFirst({
              where: { locationId: purchaseOrder.locationId, skuId: poItem.skuId },
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: { increment: quantityToAdd },
                  availableQuantity: { increment: quantityToAdd },
                },
              });
            } else {
              await tx.inventory.create({
                data: {
                  orgId,
                  locationId: purchaseOrder.locationId,
                  skuId: poItem.skuId,
                  quantity: quantityToAdd,
                  availableQuantity: quantityToAdd,
                  reorderLevel: 10,
                  reorderQuantity: 50,
                },
              });
            }
          }
        }

        // Update the purchase order
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: updateData,
        });
      });
    } else if (status === 'cancelled') {
      // If cancelling and already received, reverse inventory
      if (purchaseOrder.status === 'received' || purchaseOrder.status === 'partial') {
        await prisma.$transaction(async (tx) => {
          for (const item of purchaseOrder.items) {
            if (item.receivedQuantity && item.receivedQuantity > 0) {
              const inventory = await tx.inventory.findFirst({
                where: { locationId: purchaseOrder.locationId, skuId: item.skuId },
              });

              if (inventory) {
                await tx.inventory.update({
                  where: { id: inventory.id },
                  data: {
                    quantity: { decrement: item.receivedQuantity },
                    availableQuantity: { decrement: item.receivedQuantity },
                  },
                });
              }
            }
          }

          await tx.purchaseOrder.update({
            where: { id: poId },
            data: {
              ...updateData,
              cancelledAt: new Date(),
              cancelledBy: session.user.id,
            },
          });
        });
      } else {
        await prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            ...updateData,
            cancelledAt: new Date(),
            cancelledBy: session.user.id,
          },
        });
      }

      // Update financial transaction to cancelled
      await prisma.financialTransaction.updateMany({
        where: {
          orgId,
          referenceType: 'purchase_order',
          referenceId: poId,
        },
        data: {
          paymentStatus: 'cancelled',
          approvalStatus: 'rejected',
        },
      });
    } else {
      // Simple status update
      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: updateData,
      });
    }

    // Handle payment status update
    if (paymentStatus === 'paid') {
      // Update the linked financial transaction
      await prisma.financialTransaction.updateMany({
        where: {
          orgId,
          referenceType: 'purchase_order',
          referenceId: poId,
        },
        data: {
          paymentStatus: 'completed',
          approvalStatus: 'approved',
          approvedBy: session.user.id,
          approvedAt: new Date(),
          metadata: paymentReference ? JSON.stringify({ paymentReference }) : undefined,
        },
      });
    }

    // Fetch updated purchase order
    const updatedPO = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        supplier: true,
        items: { include: { sku: true } },
        location: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        resource: 'purchase_order',
        resourceId: poId,
        changes: { status, previousStatus: purchaseOrder.status },
        status: 'success',
      },
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error('[PURCHASE_ORDER_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}
