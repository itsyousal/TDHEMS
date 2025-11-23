import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createTransactionSchema = z.object({
  customerId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
    })
  ),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  total: z.number().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "CHECK", "DIGITAL_WALLET", "CREDIT"]),
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]),
  cashierUserId: z.string(),
});

/**
 * GET /api/transactions
 * List POS transactions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const locationId = request.headers.get("x-location-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "pos.view", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "read",
        "transactions",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const transactions = await prisma.posTransaction.findMany({
      where: {
        location: { ...(locationId && { id: locationId }), organizationId: orgId },
        ...(status && { status }),
        ...(paymentMethod && { paymentMethod }),
        ...(dateFrom || dateTo) && {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        },
      },
      include: {
        location: true,
        customer: true,
        items: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.posTransaction.count({
      where: {
        location: { ...(locationId && { id: locationId }), organizationId: orgId },
        ...(status && { status }),
        ...(paymentMethod && { paymentMethod }),
      },
    });

    await logAuditAction(userId, "read", "transactions", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/transactions
 * Create a new POS transaction
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "pos.create", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "create",
        "transactions",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createTransactionSchema.parse(body);

    // Verify location
    const location = await prisma.location.findFirst({
      where: { id: validated.locationId, organizationId: orgId },
    });
    if (!location) {
      throw new ForbiddenError("Location not found");
    }

    const transaction = await prisma.posTransaction.create({
      data: {
        customerId: validated.customerId,
        locationId: validated.locationId,
        subtotal: validated.subtotal,
        tax: validated.tax,
        discount: validated.discount,
        total: validated.total,
        paymentMethod: validated.paymentMethod,
        status: validated.status,
        cashierUserId: validated.cashierUserId,
        items: {
          create: validated.items,
        },
      },
      include: {
        location: true,
        customer: true,
        items: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "transactions",
      transaction.id,
      { transaction },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: transaction,
        message: "Transaction created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
