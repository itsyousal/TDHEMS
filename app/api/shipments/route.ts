import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createShipmentSchema = z.object({
  orderId: z.string().uuid(),
  pickListId: z.string().uuid().optional(),
  carrier: z.string(),
  trackingNumber: z.string(),
  estimatedDelivery: z.string().datetime(),
  notes: z.string().optional(),
});

/**
 * GET /api/shipments
 * List shipments
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "warehouse.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "shipments", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const shipments = await prisma.shipment.findMany({
      where: {
        order: { organizationId: orgId },
        ...(orderId && { orderId }),
        ...(status && { status }),
      },
      include: {
        order: true,
        pickList: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.shipment.count({
      where: {
        order: { organizationId: orgId },
        ...(orderId && { orderId }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "shipments", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: shipments,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/shipments
 * Create a new shipment
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "warehouse.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "shipments", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createShipmentSchema.parse(body);

    // Verify order exists
    const order = await prisma.order.findFirst({
      where: { id: validated.orderId, organizationId: orgId },
    });
    if (!order) {
      throw new ForbiddenError("Order not found");
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId: validated.orderId,
        pickListId: validated.pickListId,
        carrier: validated.carrier,
        trackingNumber: validated.trackingNumber,
        status: "PENDING",
        estimatedDelivery: new Date(validated.estimatedDelivery),
        notes: validated.notes,
      },
      include: {
        order: true,
        pickList: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "shipments",
      shipment.id,
      { shipment },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: shipment,
        message: "Shipment created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
