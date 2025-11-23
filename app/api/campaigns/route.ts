import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SOCIAL_MEDIA", "PRINT", "DIGITAL", "EVENT"]),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]),
  budget: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  targetAudience: z.string().optional(),
  channels: z.array(z.string()),
});

/**
 * GET /api/campaigns
 * List marketing campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "marketing.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "campaigns", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: orgId,
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        contentCalendarEntries: {
          take: 10,
          orderBy: { scheduledDate: "asc" },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { startDate: "desc" },
    });

    const total = await prisma.campaign.count({
      where: {
        organizationId: orgId,
        ...(status && { status }),
        ...(type && { type }),
      },
    });

    await logAuditAction(userId, "read", "campaigns", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "marketing.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "campaigns", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: orgId,
        name: validated.name,
        description: validated.description,
        type: validated.type,
        status: validated.status,
        budget: validated.budget,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        targetAudience: validated.targetAudience,
        channels: validated.channels,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "campaigns",
      campaign.id,
      { campaign },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: campaign,
        message: "Campaign created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
