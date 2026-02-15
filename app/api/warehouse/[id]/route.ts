import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, jsonErrorResponse, ERROR_CODES, successResponse } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) {
    return jsonErrorResponse(ERROR_CODES.UNAUTHORIZED, "Unauthorized", 401);
  }

  try {
    const { id } = await params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        location: true,
        bins: {
          orderBy: { code: 'asc' }
        },
      },
    });

    if (!warehouse) {
      return jsonErrorResponse(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Warehouse not found",
        404
      );
    }

    return jsonResponse(
      successResponse(warehouse),
      200
    );
  } catch (error) {
    console.error("[WAREHOUSE_GET_BY_ID]", error);
    return jsonErrorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Failed to fetch warehouse",
      500
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user?.organizationId) {
    return jsonErrorResponse(ERROR_CODES.UNAUTHORIZED, "Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, capacity, isActive, description } = body;

    // Verify warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { location: true }
    });

    if (!existingWarehouse) {
      return jsonErrorResponse(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Warehouse not found",
        404
      );
    }

    // Check for duplicate name in same location if name is being changed
    if (name && name.trim() !== existingWarehouse.name) {
      const duplicate = await prisma.warehouse.findFirst({
        where: {
          locationId: existingWarehouse.locationId,
          name: name.trim(),
          id: { not: id },
        },
      });

      if (duplicate) {
        return jsonErrorResponse(
          ERROR_CODES.CONFLICT,
          `A warehouse named "${name.trim()}" already exists at this location`,
          409,
          { field: "name" }
        );
      }
    }

    // Update warehouse
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(typeof capacity !== 'undefined' && { capacity: capacity ? parseFloat(capacity) : null }),
        ...(typeof isActive !== 'undefined' && { isActive }),
      },
      include: {
        location: true,
        bins: true,
      },
    });

    return jsonResponse(
      successResponse(updatedWarehouse),
      200
    );
  } catch (error) {
    console.error("[WAREHOUSE_UPDATE_PATCH]", error);
    return jsonErrorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Failed to update warehouse",
      500
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user?.organizationId) {
    return jsonErrorResponse(ERROR_CODES.UNAUTHORIZED, "Unauthorized", 401);
  }

  try {
    const { id } = await params;

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { bins: true }
    });

    if (!warehouse) {
      return jsonErrorResponse(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Warehouse not found",
        404
      );
    }

    // Check if warehouse has bins
    if (warehouse.bins.length > 0) {
      return jsonErrorResponse(
        ERROR_CODES.CONFLICT,
        `Cannot delete warehouse with existing bins. Please delete ${warehouse.bins.length} bin(s) first.`,
        409,
        { binsCount: warehouse.bins.length }
      );
    }

    // Delete warehouse
    await prisma.warehouse.delete({
      where: { id },
    });

    return jsonResponse(
      successResponse({ message: `Warehouse "${warehouse.name}" deleted successfully` }),
      200
    );
  } catch (error) {
    console.error("[WAREHOUSE_DELETE]", error);
    return jsonErrorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Failed to delete warehouse",
      500
    );
  }
}
