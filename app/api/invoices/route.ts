import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createInvoiceSchema = z.object({
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  amount: z.number().positive(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
    })
  ),
});

/**
 * GET /api/invoices
 * List invoices
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "finance.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "invoices", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const invoices = await prisma.invoice.findMany({
      where: {
        customer: { organizationId: orgId },
        ...(customerId && { customerId }),
        ...(status && { status }),
      },
      include: {
        customer: true,
        items: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.invoice.count({
      where: {
        customer: { organizationId: orgId },
        ...(customerId && { customerId }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "invoices", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "finance.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "invoices", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createInvoiceSchema.parse(body);

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, organizationId: orgId },
    });
    if (!customer) {
      throw new ForbiddenError("Customer not found");
    }

    const invoice = await prisma.invoice.create({
      data: {
        customerId: validated.customerId,
        invoiceNumber: validated.invoiceNumber,
        amount: validated.amount,
        tax: validated.tax,
        discount: validated.discount,
        status: "DRAFT",
        dueDate: new Date(validated.dueDate),
        notes: validated.notes,
        items: {
          create: validated.items,
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "invoices",
      invoice.id,
      { invoice },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: invoice,
        message: "Invoice created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
