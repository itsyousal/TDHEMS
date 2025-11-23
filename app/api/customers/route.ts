import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  customerType: z.enum(["INDIVIDUAL", "BUSINESS", "WHOLESALE"]),
  creditLimit: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/customers
 * List customers
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "crm.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "customers", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const customerType = searchParams.get("customerType");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: orgId,
        ...(customerType && { customerType }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        interactions: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.customer.count({
      where: {
        organizationId: orgId,
        ...(customerType && { customerType }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }),
      },
    });

    await logAuditAction(userId, "read", "customers", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "crm.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "customers", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        customerType: validated.customerType,
        creditLimit: validated.creditLimit,
        notes: validated.notes,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "customers",
      customer.id,
      { customer },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: customer,
        message: "Customer created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
