import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createInteractionSchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(["PHONE", "EMAIL", "MEETING", "SUPPORT_TICKET", "FEEDBACK"]),
  subject: z.string().min(1),
  notes: z.string(),
  outcome: z.string().optional(),
  nextFollowUp: z.string().datetime().optional(),
  recordedBy: z.string(),
});

/**
 * GET /api/customer-interactions
 * List customer interactions
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
      await logAuditAction(
        userId,
        "read",
        "customer_interactions",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const interactions = await prisma.customerInteraction.findMany({
      where: {
        customer: { organizationId: orgId },
        ...(customerId && { customerId }),
        ...(type && { type }),
      },
      include: {
        customer: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.customerInteraction.count({
      where: {
        customer: { organizationId: orgId },
        ...(customerId && { customerId }),
        ...(type && { type }),
      },
    });

    await logAuditAction(userId, "read", "customer_interactions", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: interactions,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/customer-interactions
 * Create a new customer interaction
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
      await logAuditAction(
        userId,
        "create",
        "customer_interactions",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createInteractionSchema.parse(body);

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, organizationId: orgId },
    });
    if (!customer) {
      throw new ForbiddenError("Customer not found");
    }

    const interaction = await prisma.customerInteraction.create({
      data: {
        customerId: validated.customerId,
        type: validated.type,
        subject: validated.subject,
        notes: validated.notes,
        outcome: validated.outcome,
        nextFollowUp: validated.nextFollowUp ? new Date(validated.nextFollowUp) : null,
        recordedBy: validated.recordedBy,
      },
      include: {
        customer: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "customer_interactions",
      interaction.id,
      { interaction },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: interaction,
        message: "Customer interaction recorded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
