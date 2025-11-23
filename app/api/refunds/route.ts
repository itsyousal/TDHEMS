import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createRefundSchema = z.object({
  transactionId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.enum(["CUSTOMER_REQUEST", "PRODUCT_DEFECT", "OVERPAYMENT", "ERROR", "OTHER"]),
  description: z.string().optional(),
  refundMethod: z.enum(["CASH", "CARD", "CREDIT", "STORE_CREDIT"]),
  processedBy: z.string(),
  approvedBy: z.string().optional(),
});

/**
 * GET /api/refunds
 * List refunds
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
      await logAuditAction(userId, "read", "refunds", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const reason = searchParams.get("reason");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const refunds = await prisma.refund.findMany({
      where: {
        transaction: { location: { organizationId: orgId } },
        ...(transactionId && { transactionId }),
        ...(reason && { reason }),
      },
      include: {
        transaction: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.refund.count({
      where: {
        transaction: { location: { organizationId: orgId } },
        ...(transactionId && { transactionId }),
        ...(reason && { reason }),
      },
    });

    await logAuditAction(userId, "read", "refunds", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: refunds,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/refunds
 * Create a new refund
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
      await logAuditAction(userId, "create", "refunds", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createRefundSchema.parse(body);

    // Verify transaction
    const transaction = await prisma.posTransaction.findFirst({
      where: {
        id: validated.transactionId,
        location: { organizationId: orgId },
      },
    });
    if (!transaction) {
      throw new ForbiddenError("Transaction not found");
    }

    // Verify refund amount doesn't exceed transaction total
    if (validated.amount > transaction.total) {
      throw new ValidationError("Refund amount exceeds transaction total");
    }

    const refund = await prisma.refund.create({
      data: {
        transactionId: validated.transactionId,
        amount: validated.amount,
        reason: validated.reason,
        description: validated.description,
        refundMethod: validated.refundMethod,
        processedBy: validated.processedBy,
        approvedBy: validated.approvedBy,
      },
      include: {
        transaction: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "refunds",
      refund.id,
      { refund },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: refund,
        message: "Refund processed successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
