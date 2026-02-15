import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { jsonErrorResponse, ERROR_CODES } from "@/lib/api-response";

/**
 * GET /api/admin/locations
 * Get all locations for the current organization
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.organizationId) {
    return jsonErrorResponse(ERROR_CODES.UNAUTHORIZED, "Unauthorized", 401);
  }

  try {
    const locations = await prisma.location.findMany({
      where: {
        orgId: session.user.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        state: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("[LOCATIONS_GET]", error);
    return jsonErrorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Failed to fetch locations",
      500
    );
  }
}
