import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().datetime(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EARLY_LEAVE", "HALF_DAY"]),
  notes: z.string().optional(),
});

/**
 * GET /api/attendance
 * List attendance records
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
      await logAuditAction(userId, "read", "attendance", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const records = await prisma.attendance.findMany({
      where: {
        employee: { organizationId: orgId },
        ...(employeeId && { employeeId }),
        ...(status && { status }),
        ...(dateFrom || dateTo) && {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        },
      },
      include: {
        employee: true,
      },
      take: limit,
      skip: offset,
      orderBy: { date: "desc" },
    });

    const total = await prisma.attendance.count({
      where: {
        employee: { organizationId: orgId },
        ...(employeeId && { employeeId }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "attendance", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/attendance
 * Record attendance
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
      await logAuditAction(userId, "create", "attendance", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createAttendanceSchema.parse(body);

    // Verify employee
    const employee = await prisma.employee.findFirst({
      where: { id: validated.employeeId, organizationId: orgId },
    });
    if (!employee) {
      throw new ForbiddenError("Employee not found");
    }

    const record = await prisma.attendance.create({
      data: {
        employeeId: validated.employeeId,
        date: new Date(validated.date),
        checkIn: new Date(validated.checkIn),
        checkOut: validated.checkOut ? new Date(validated.checkOut) : null,
        status: validated.status,
        notes: validated.notes,
      },
      include: {
        employee: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "attendance",
      record.id,
      { record },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: record,
        message: "Attendance record created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
