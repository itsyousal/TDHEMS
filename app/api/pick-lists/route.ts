import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createPickListSchema = z.object({
  orderId: z.string().uuid(),
  warehouseLocationId: z.string().uuid(),
  items: z.array(
    z.object({
      inventoryItemId: z.string().uuid(),
      quantity: z.number().positive(),
    })
  ),
  notes: z.string().optional(),
});

/**
 * GET /api/pick-lists
 * List pick lists (warehouse orders)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const locationId = request.headers.get("x-location-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "warehouse.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "pick_lists", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const pickLists = await prisma.pickList.findMany({
      where: {
        warehouse: { locationId: locationId || undefined, organizationId: orgId },
        ...(orderId && { orderId }),
        ...(status && { status }),
      },
      include: {
        order: true,
        warehouse: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.pickList.count({
      where: {
        warehouse: { locationId: locationId || undefined, organizationId: orgId },
        ...(orderId && { orderId }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "pick_lists", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: pickLists,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/pick-lists
 * Create a new pick list
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "warehouse.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "pick_lists", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createPickListSchema.parse(body);

    // Verify order and warehouse
    const order = await prisma.order.findFirst({
      where: { id: validated.orderId, organizationId: orgId },
    });
    if (!order) {
      throw new ForbiddenError("Order not found");
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: validated.warehouseLocationId, organizationId: orgId },
    });
    if (!warehouse) {
      throw new ForbiddenError("Warehouse location not found");
    }

    // Create pick list with items
    const pickList = await prisma.pickList.create({
      data: {
        orderId: validated.orderId,
        warehouseId: validated.warehouseLocationId,
        status: "PENDING",
        notes: validated.notes,
        items: {
          create: validated.items,
        },
      },
      include: {
        order: true,
        warehouse: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    await logAuditAction(
      userId,
      "create",
      "pick_lists",
      pickList.id,
      { pickList },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: pickList,
        message: "Pick list created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
