import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createPaymentMethodSchema = z.object({
  customerId: z.string().uuid().optional(),
  type: z.enum(["CARD", "BANK_ACCOUNT", "DIGITAL_WALLET", "OTHER"]),
  provider: z.string(),
  reference: z.string(),
  lastFourDigits: z.string().optional(),
  expiryDate: z.string().optional(),
  isDefault: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]),
});

/**
 * GET /api/payment-methods
 * List payment methods
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "pos.view", orgId);
    if (!hasAccess) {
      await logAuditAction(
        userId,
        "read",
        "payment_methods",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const methods = await prisma.paymentMethod.findMany({
      where: {
        ...(customerId && { customerId }),
        ...(status && { status }),
        ...(type && { type }),
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.paymentMethod.count({
      where: {
        ...(customerId && { customerId }),
        ...(status && { status }),
        ...(type && { type }),
      },
    });

    await logAuditAction(userId, "read", "payment_methods", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: methods,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/payment-methods
 * Create a new payment method
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
        "payment_methods",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createPaymentMethodSchema.parse(body);

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        customerId: validated.customerId,
        type: validated.type,
        provider: validated.provider,
        reference: validated.reference,
        lastFourDigits: validated.lastFourDigits,
        expiryDate: validated.expiryDate,
        isDefault: validated.isDefault,
        status: validated.status,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "payment_methods",
      paymentMethod.id,
      { paymentMethod },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: paymentMethod,
        message: "Payment method created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
