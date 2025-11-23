import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createBatchIngredientSchema = z.object({
  batchId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  quantityUsed: z.number().positive(),
  unitOfMeasure: z.string(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
});

/**
 * GET /api/batch-ingredients
 * List ingredients used in batches
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "production.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "batch_ingredients", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const ingredientId = searchParams.get("ingredientId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const ingredients = await prisma.batchIngredient.findMany({
      where: {
        batch: { organizationId: orgId },
        ...(batchId && { batchId }),
        ...(ingredientId && { ingredientId }),
      },
      include: {
        batch: true,
        ingredient: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.batchIngredient.count({
      where: {
        batch: { organizationId: orgId },
        ...(batchId && { batchId }),
        ...(ingredientId && { ingredientId }),
      },
    });

    await logAuditAction(userId, "read", "batch_ingredients", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: ingredients,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/batch-ingredients
 * Add ingredient to production batch
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "production.create", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "create",
        "batch_ingredients",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createBatchIngredientSchema.parse(body);

    // Verify batch belongs to org
    const batch = await prisma.productionBatch.findFirst({
      where: { id: validated.batchId, organizationId: orgId },
    });

    if (!batch) {
      throw new ForbiddenError("Batch not found");
    }

    // Verify ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: validated.ingredientId },
    });

    if (!ingredient || ingredient.organizationId !== orgId) {
      throw new ForbiddenError("Ingredient not found");
    }

    // Check inventory availability
    const inventory = await prisma.inventoryItem.findFirst({
      where: {
        ingredientId: validated.ingredientId,
        organizationId: orgId,
      },
    });

    if (!inventory || inventory.quantity < validated.quantityUsed) {
      throw new ValidationError("Insufficient inventory for ingredient");
    }

    // Create batch ingredient entry
    const batchIngredient = await prisma.batchIngredient.create({
      data: {
        batchId: validated.batchId,
        ingredientId: validated.ingredientId,
        quantityUsed: validated.quantityUsed,
        unitOfMeasure: validated.unitOfMeasure,
        lotNumber: validated.lotNumber,
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
      },
      include: {
        batch: true,
        ingredient: true,
      },
    });

    // Deduct from inventory
    await prisma.inventoryItem.update({
      where: { id: inventory.id },
      data: { quantity: inventory.quantity - validated.quantityUsed },
    });

    // Log audit
    await logAuditAction(userId, "create", "batch_ingredients", batchIngredient.id, { batchIngredient }, "success");

    return NextResponse.json(
      {
        success: true,
        data: batchIngredient,
        message: "Ingredient added to batch successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
