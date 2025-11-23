import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfHire: z.string().datetime(),
  position: z.string(),
  department: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  salary: z.number().positive().optional(),
  locationId: z.string().uuid(),
});

/**
 * GET /api/employees
 * List employees
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const locationId = request.headers.get("x-location-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "hr.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "employees", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        ...(locationId && { locationId }),
        ...(status && { status }),
        ...(department && { department }),
      },
      include: {
        location: true,
        attendanceRecords: {
          take: 5,
          orderBy: { date: "desc" },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.employee.count({
      where: {
        organizationId: orgId,
        ...(locationId && { locationId }),
        ...(status && { status }),
        ...(department && { department }),
      },
    });

    await logAuditAction(userId, "read", "employees", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/employees
 * Create a new employee
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
      await logAuditAction(userId, "create", "employees", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createEmployeeSchema.parse(body);

    // Verify location
    const location = await prisma.location.findFirst({
      where: { id: validated.locationId, organizationId: orgId },
    });
    if (!location) {
      throw new ForbiddenError("Location not found");
    }

    const employee = await prisma.employee.create({
      data: {
        organizationId: orgId,
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        dateOfHire: new Date(validated.dateOfHire),
        position: validated.position,
        department: validated.department,
        status: validated.status,
        salary: validated.salary,
        locationId: validated.locationId,
      },
      include: {
        location: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "employees",
      employee.id,
      { employee },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: employee,
        message: "Employee created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
