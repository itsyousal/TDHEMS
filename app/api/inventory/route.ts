import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createInventorySchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().positive(),
  reorderLevel: z.number().nonnegative(),
  warehouseLocationId: z.string().uuid().optional(),
});

const updateInventorySchema = z.object({
  quantity: z.number().nonnegative(),
  reorderLevel: z.number().nonnegative().optional(),
});

/**
 * GET /api/inventory
 * List inventory items with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "inventory.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "inventory_items", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const ingredientId = searchParams.get("ingredientId");
    const low = searchParams.get("low") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const items = await prisma.inventoryItem.findMany({
      where: {
        organizationId: orgId,
        ...(ingredientId && { ingredientId }),
        ...(low && {
          quantity: {
            lte: prisma.inventoryItem.fields.reorderLevel,
          },
        }),
      },
      include: {
        ingredient: true,
        warehouseLocation: true,
      },
      take: limit,
      skip: offset,
      orderBy: { updatedAt: "desc" },
    });

    const total = await prisma.inventoryItem.count({
      where: {
        organizationId: orgId,
        ...(ingredientId && { ingredientId }),
      },
    });

    await logAuditAction(userId, "read", "inventory_items", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/inventory
 * Create inventory entry
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "inventory.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "inventory_items", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createInventorySchema.parse(body);

    // Verify ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: validated.ingredientId },
    });

    if (!ingredient || ingredient.organizationId !== orgId) {
      throw new ForbiddenError("Ingredient not found");
    }

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        ingredientId: validated.ingredientId,
        organizationId: orgId,
        quantity: validated.quantity,
        reorderLevel: validated.reorderLevel,
        warehouseLocationId: validated.warehouseLocationId,
      },
      include: {
        ingredient: true,
        warehouseLocation: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "inventory_items",
      inventoryItem.id,
      { inventoryItem },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: inventoryItem,
        message: "Inventory item created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
