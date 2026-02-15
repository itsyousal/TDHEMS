import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, jsonErrorResponse, ERROR_CODES, successResponse } from "@/lib/api-response";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                bins: {
                    orderBy: {
                        code: 'asc'
                    }
                },
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(warehouses);
    } catch (error) {
        console.error("[WAREHOUSE_LIST_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
        return jsonErrorResponse(ERROR_CODES.UNAUTHORIZED, "Unauthorized", 401);
    }

    try {
        const body = await request.json();
        const { name, locationId, capacity, description, isActive } = body;

        // Validation
        if (!name || !name.trim()) {
            return jsonErrorResponse(
                ERROR_CODES.VALIDATION_ERROR,
                "Warehouse name is required",
                400,
                { field: "name" }
            );
        }

        if (!locationId) {
            return jsonErrorResponse(
                ERROR_CODES.VALIDATION_ERROR,
                "Location ID is required",
                400,
                { field: "locationId" }
            );
        }

        // Verify location exists and belongs to the org
        const location = await prisma.location.findFirst({
            where: {
                id: locationId,
                orgId: session.user.organizationId,
            },
            select: {
                id: true,
                orgId: true,
                name: true,
                slug: true,
            },
        });

        if (!location) {
            return jsonErrorResponse(
                ERROR_CODES.RESOURCE_NOT_FOUND,
                "Location not found",
                404,
                { field: "locationId" }
            );
        }

        // Check if warehouse with same name already exists in this location
        const existingWarehouse = await prisma.warehouse.findFirst({
            where: {
                locationId,
                name: name.trim(),
            },
        });

        if (existingWarehouse) {
            return jsonErrorResponse(
                ERROR_CODES.CONFLICT,
                `A warehouse named "${name.trim()}" already exists at this location`,
                409,
                { field: "name" }
            );
        }

        // Create warehouse
        const warehouse = await prisma.warehouse.create({
            data: {
                name: name.trim(),
                locationId,
                capacity: capacity ? parseFloat(capacity) : null,
                isActive: isActive !== false, // Default to active
            },
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                bins: true,
            },
        });

        return jsonResponse(
            successResponse(warehouse),
            201
        );
    } catch (error) {
        console.error("[WAREHOUSE_CREATE_POST]", error);
        return jsonErrorResponse(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            "Failed to create warehouse",
            500
        );
    }
}
