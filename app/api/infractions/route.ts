import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createInfractionSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["TARDINESS", "ABSENCE", "MISCONDUCT", "SAFETY_VIOLATION", "PERFORMANCE_ISSUE"]),
  severity: z.enum(["WARNING", "SUSPENSION", "TERMINATION"]),
  description: z.string(),
  incidentDate: z.string().datetime(),
  reportedBy: z.string(),
  actionTaken: z.string().optional(),
  resolutionDate: z.string().datetime().optional(),
});

/**
 * GET /api/infractions
 * List employee infractions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "hr.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "infractions", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const infractions = await prisma.infraction.findMany({
      where: {
        employee: { organizationId: orgId },
        ...(employeeId && { employeeId }),
        ...(severity && { severity }),
        ...(type && { type }),
      },
      include: {
        employee: true,
      },
      take: limit,
      skip: offset,
      orderBy: { incidentDate: "desc" },
    });

    const total = await prisma.infraction.count({
      where: {
        employee: { organizationId: orgId },
        ...(employeeId && { employeeId }),
        ...(severity && { severity }),
        ...(type && { type }),
      },
    });

    await logAuditAction(userId, "read", "infractions", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: infractions,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/infractions
 * Report an infraction
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "hr.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "infractions", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createInfractionSchema.parse(body);

    // Verify employee
    const employee = await prisma.employee.findFirst({
      where: { id: validated.employeeId, organizationId: orgId },
    });
    if (!employee) {
      throw new ForbiddenError("Employee not found");
    }

    const infraction = await prisma.infraction.create({
      data: {
        employeeId: validated.employeeId,
        type: validated.type,
        severity: validated.severity,
        description: validated.description,
        incidentDate: new Date(validated.incidentDate),
        reportedBy: validated.reportedBy,
        actionTaken: validated.actionTaken,
        resolutionDate: validated.resolutionDate ? new Date(validated.resolutionDate) : null,
      },
      include: {
        employee: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "infractions",
      infraction.id,
      { infraction },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: infraction,
        message: "Infraction recorded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
