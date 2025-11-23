// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";

/**
 * GET /api/orders
 * List orders with filtering and pagination
 * Query params: status, channel, location, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    // Check permission
    const hasAccess = await hasPermission(userId, "orders.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "orders", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("You don't have permission to view orders");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        ...(status && { status }),
      },
      include: {
        items: {
          include: { sku: true },
        },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({
      where: { organizationId: orgId, ...(status && { status }) },
    });

    await logAuditAction(userId, "read", "orders", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");
    const locationId = request.headers.get("x-location-id");

    if (!userId || !orgId || !locationId) {
      throw new ForbiddenError("Missing user, org, or location context");
    }

    // Check permission
    const hasAccess = await hasPermission(userId, "orders.create", orgId, locationId);
    if (!hasAccess) {
      throw new ForbiddenError("You don't have permission to create orders");
    }

    const body = await request.json();

    // Validate input
    const validated = createOrderSchema.parse(body);

    // Verify all SKUs exist and are accessible
    const skus = await prisma.sku.findMany({
      where: {
        id: { in: validated.items.map((i) => i.skuId) },
        orgId,
      },
    });

    if (skus.length !== validated.items.length) {
      throw new ValidationError("One or more SKUs not found or not accessible");
    }

    // Generate order number
    const orderCount = await prisma.order.count({ where: { orgId } });
    const orderNumber = `ORD-${orgId.substring(0, 8).toUpperCase()}-${String(orderCount + 1).padStart(6, "0")}`;

    // Create order with items in transaction
    const order = await prisma.order.create({
      data: {
        orgId,
        locationId,
        orderNumber,
        channelSourceId: validated.channelSourceId,
        customerId: validated.customerId,
        totalAmount: validated.totalAmount,
        taxAmount: validated.taxAmount,
        discountAmount: validated.discountAmount,
        netAmount: validated.totalAmount - validated.discountAmount + validated.taxAmount,
        notes: validated.notes,
        items: {
          create: validated.items.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: { include: { sku: true } },
      },
    });

    // Log audit
    await logAuditAction(userId, "create", "orders", order.id, { orderNumber }, "success");

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: `Order ${orderNumber} created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    if (error instanceof ValidationError) {
      await logAuditAction(
        request.headers.get("x-user-id"),
        "create",
        "orders",
        null,
        {},
        "failure",
        "Validation error"
      );
    }
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
