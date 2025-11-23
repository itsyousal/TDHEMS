import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createBatchSchema = z.object({
  skuId: z.string().uuid(),
  quantity: z.number().positive(),
  batchDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  locationId: z.string().uuid(),
});

/**
 * GET /api/batches
 * List production batches with filtering and pagination
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
      await logAuditAction(userId, "read", "batches", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("You don't have permission to view batches");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const batches = await prisma.productionBatch.findMany({
      where: {
        organizationId: orgId,
        ...(status && { status }),
      },
      include: {
        sku: true,
        location: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.productionBatch.count({
      where: { organizationId: orgId, ...(status && { status }) },
    });

    await logAuditAction(userId, "read", "batches", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: batches,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    console.error("GET /api/batches error:", error);
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/batches
 * Create a new production batch
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const locationId = request.headers.get("x-location-id");

    if (!userId || !orgId || !locationId) {
      throw new ForbiddenError("Missing user, org, or location context");
    }

    const hasAccess = await hasPermission(userId, "production.create", orgId, locationId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "batches", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("You don't have permission to create batches");
    }

    const body = await request.json();
    const validated = createBatchSchema.parse(body);

    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber: `BATCH-${Date.now()}`,
        organizationId: orgId,
        locationId: validated.locationId,
        skuId: validated.skuId,
        quantity: validated.quantity,
        plannedDate: validated.batchDate ? new Date(validated.batchDate) : new Date(),
        status: "PLANNED",
        notes: validated.notes,
      },
      include: {
        sku: true,
        location: true,
      },
    });

    await logAuditAction(userId, "create", "batches", batch.id, { batch }, "success");

    return NextResponse.json(
      {
        success: true,
        data: batch,
        message: `Batch ${batch.batchNumber} created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/batches error:", error);
    if (error instanceof ValidationError) {
      await logAuditAction(
        request.headers.get("x-user-id"),
        "create",
        "batches",
        null,
        {},
        "failure",
        "Validation error"
      );
    }
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
