import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createChecklistRunSchema = z.object({
  checklistId: z.string().uuid(),
  referenceId: z.string().uuid(),
  completedBy: z.string(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      passed: z.boolean(),
      notes: z.string().optional(),
    })
  ),
  overallStatus: z.enum(["PASS", "FAIL", "REWORK"]),
});

/**
 * GET /api/checklist-runs
 * List checklist runs
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "quality.view", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "read",
        "checklist_runs",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get("checklistId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const runs = await prisma.checklistRun.findMany({
      where: {
        checklist: { organizationId: orgId },
        ...(checklistId && { checklistId }),
        ...(status && { overallStatus: status }),
      },
      include: {
        checklist: true,
        items: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.checklistRun.count({
      where: {
        checklist: { organizationId: orgId },
        ...(checklistId && { checklistId }),
        ...(status && { overallStatus: status }),
      },
    });

    await logAuditAction(userId, "read", "checklist_runs", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: runs,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/checklist-runs
 * Create a new checklist run
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "quality.create", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "create",
        "checklist_runs",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createChecklistRunSchema.parse(body);

    // Verify checklist
    const checklist = await prisma.checklist.findFirst({
      where: { id: validated.checklistId, organizationId: orgId },
    });
    if (!checklist) {
      throw new ForbiddenError("Checklist not found");
    }

    const run = await prisma.checklistRun.create({
      data: {
        checklistId: validated.checklistId,
        referenceId: validated.referenceId,
        completedBy: validated.completedBy,
        overallStatus: validated.overallStatus,
        items: {
          create: validated.items,
        },
      },
      include: {
        checklist: true,
        items: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "checklist_runs",
      run.id,
      { run },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: run,
        message: "Checklist run created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
