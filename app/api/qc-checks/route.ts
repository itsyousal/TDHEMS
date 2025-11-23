import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createQCCheckSchema = z.object({
  batchId: z.string().uuid(),
  checkType: z.enum(["VISUAL", "WEIGHT", "TEXTURE", "TASTE", "PACKAGING", "OTHER"]),
  result: z.enum(["PASS", "FAIL", "REWORK"]),
  notes: z.string().optional(),
  checkedBy: z.string(),
});

/**
 * GET /api/qc-checks
 * List QC checks with filtering
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
      await logAuditAction(userId, "read", "qc_checks", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const result = searchParams.get("result");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const checks = await prisma.qcCheck.findMany({
      where: {
        batch: { organizationId: orgId },
        ...(batchId && { batchId }),
        ...(result && { result }),
      },
      include: {
        batch: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.qcCheck.count({
      where: {
        batch: { organizationId: orgId },
        ...(batchId && { batchId }),
        ...(result && { result }),
      },
    });

    await logAuditAction(userId, "read", "qc_checks", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: checks,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/qc-checks
 * Create a new QC check
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
      await logAuditAction(userId, "create", "qc_checks", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createQCCheckSchema.parse(body);

    // Verify batch belongs to org
    const batch = await prisma.productionBatch.findFirst({
      where: { id: validated.batchId, organizationId: orgId },
    });

    if (!batch) {
      throw new ForbiddenError("Batch not found");
    }

    const check = await prisma.qcCheck.create({
      data: {
        batchId: validated.batchId,
        checkType: validated.checkType,
        result: validated.result,
        notes: validated.notes,
        checkedBy: validated.checkedBy,
        checkedAt: new Date(),
      },
      include: { batch: true },
    });

    // Update batch status if all checks passed
    if (validated.result === "PASS") {
      await prisma.productionBatch.update({
        where: { id: validated.batchId },
        data: { status: "QC_PASSED" },
      });
    } else if (validated.result === "FAIL") {
      await prisma.productionBatch.update({
        where: { id: validated.batchId },
        data: { status: "QC_FAILED" },
      });
    }

    await logAuditAction(userId, "create", "qc_checks", check.id, { check }, "success");

    return NextResponse.json(
      {
        success: true,
        data: check,
        message: "QC check created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
