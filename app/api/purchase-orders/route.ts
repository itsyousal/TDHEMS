import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/purchase-orders
 * List all purchase orders with filtering
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission
    const canView = await hasPermission(session.user.id, 'inventory.view', orgId) ||
                    await hasPermission(session.user.id, 'purchases.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Purchase order view permission required.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplierId');

    const where: any = { orgId };

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              sku: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  unit: true,
                },
              },
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    // Summary stats
    const summary = await prisma.purchaseOrder.aggregate({
      where: { orgId },
      _sum: { totalCost: true },
      _count: { id: true },
    });

    const pendingSummary = await prisma.purchaseOrder.aggregate({
      where: { orgId, status: 'pending' },
      _sum: { totalCost: true },
      _count: { id: true },
    });

    return NextResponse.json({
      purchaseOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalValue: summary._sum?.totalCost ?? 0,
        totalCount: summary._count ?? 0,
        pendingValue: pendingSummary._sum?.totalCost ?? 0,
        pendingCount: pendingSummary._count ?? 0,
      },
    });
  } catch (error) {
    console.error('[PURCHASE_ORDERS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchase-orders
 * Create a new purchase order
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Check permission
    const canCreate = await hasPermission(session.user.id, 'purchases.create', orgId) ||
                      await hasPermission(session.user.id, 'inventory.edit', orgId);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Access denied. Purchase order create permission required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      supplierId,
      locationId,
      expectedDeliveryDate,
      notes,
      items, // Array of { skuId, quantity, unitCost }
      autoReceive, // If true, automatically receive items into inventory
    } = body;

    // Validate required fields
    if (!locationId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Location and items are required' },
        { status: 400 }
      );
    }

    // Validate location
    const location = await prisma.location.findFirst({
      where: { id: locationId, orgId },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      );
    }

    // Validate supplier if provided
    if (supplierId) {
      const supplier = await prisma.customer.findFirst({
        where: { id: supplierId, orgId, segment: 'supplier' },
      });

      if (!supplier) {
        return NextResponse.json(
          { error: 'Invalid supplier' },
          { status: 400 }
        );
      }
    }

    // Validate and normalize items
    interface ValidatedItem {
      skuId: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
      receivedQuantity: number;
    }
    const validatedItems: ValidatedItem[] = [];
    let totalCost = 0;

    for (const item of items) {
      if (!item.skuId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have a valid SKU and quantity' },
          { status: 400 }
        );
      }

      const sku = await prisma.sku.findFirst({
        where: { id: item.skuId, orgId },
      });

      if (!sku) {
        return NextResponse.json(
          { error: `SKU not found: ${item.skuId}` },
          { status: 400 }
        );
      }

      const quantity = parseFloat(String(item.quantity));
      const unitCost = parseFloat(String(item.unitCost || sku.costPrice || 0));
      const itemTotalCost = quantity * unitCost;

      validatedItems.push({
        skuId: item.skuId,
        quantity,
        unitCost,
        totalCost: itemTotalCost,
        receivedQuantity: autoReceive ? quantity : 0,
      });

      totalCost += itemTotalCost;
    }

    // Generate PO number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const poCount = await prisma.purchaseOrder.count({
      where: {
        orgId,
        poNumber: { startsWith: `PO-${dateStr}` },
      },
    });
    const poNumber = `PO-${dateStr}-${String(poCount + 1).padStart(4, '0')}`;

    // Create the purchase order with transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orgId,
          poNumber,
          supplierId: supplierId || null,
          locationId,
          status: autoReceive ? 'received' : 'pending',
          totalCost,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          receivedDate: autoReceive ? new Date() : null,
          notes,
          createdBy: session.user.id,
          items: {
            create: validatedItems,
          },
        },
        include: {
          supplier: true,
          items: {
            include: { sku: true },
          },
          location: true,
        },
      });

      // If auto-receive, update inventory
      if (autoReceive) {
        for (const item of validatedItems) {
          // Find or create inventory record
          let inventory = await tx.inventory.findFirst({
            where: { locationId, skuId: item.skuId },
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: { increment: item.quantity },
                availableQuantity: { increment: item.quantity },
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                orgId,
                locationId,
                skuId: item.skuId,
                quantity: item.quantity,
                availableQuantity: item.quantity,
                reorderLevel: 10,
                reorderQuantity: 50,
              },
            });
          }
        }
      }

      // Auto-record financial transaction for this purchase
      const txnDateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const txnCount = await tx.financialTransaction.count({
        where: {
          orgId,
          transactionNumber: { startsWith: `TXN-${txnDateStr}` },
        },
      });
      const transactionNumber = `TXN-${txnDateStr}-${String(txnCount + 1).padStart(5, '0')}`;

      await tx.financialTransaction.create({
        data: {
          orgId,
          transactionNumber,
          type: 'purchase',
          category: 'inventory',
          subCategory: 'purchase_order',
          amount: -totalCost, // Negative for expense/outflow
          netAmount: -totalCost,
          referenceType: 'purchase_order',
          referenceId: purchaseOrder.id,
          paymentMethod: null, // Will be set when paid
          paymentStatus: 'pending',
          description: `Purchase Order ${poNumber} - ${purchaseOrder.supplier?.name || 'Direct Purchase'}`,
          transactionDate: new Date(),
          createdBy: session.user.id,
          approvalStatus: 'pending', // Purchases need approval
        },
      });

      return purchaseOrder;
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        resource: 'purchase_order',
        resourceId: result.id,
        changes: { poNumber, totalCost, itemCount: validatedItems.length },
        status: 'success',
      },
    });

    return NextResponse.json({
      purchaseOrder: result,
      message: autoReceive
        ? `Purchase order ${poNumber} created and items received into inventory`
        : `Purchase order ${poNumber} created successfully`,
    }, { status: 201 });
  } catch (error) {
    console.error('[PURCHASE_ORDERS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
