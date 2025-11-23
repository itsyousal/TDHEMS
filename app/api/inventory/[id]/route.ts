import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const updateInventorySchema = z.object({
  quantity: z.number().nonnegative(),
  reorderLevel: z.number().nonnegative().optional(),
});

/**
 * PATCH /api/inventory/[id]
 * Update inventory item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "inventory.update", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "update",
        "inventory_items",
        params.id,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = updateInventorySchema.parse(body);

    const item = await prisma.inventoryItem.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!item) {
      throw new ForbiddenError("Inventory item not found");
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        quantity: validated.quantity,
        ...(validated.reorderLevel !== undefined && { reorderLevel: validated.reorderLevel }),
      },
      include: {
        ingredient: true,
        warehouseLocation: true,
      },
    });

    await logAuditAction(
      userId,
      "update",
      "inventory_items",
      params.id,
      { before: item, after: updated },
      "success"
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Inventory item updated successfully",
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
