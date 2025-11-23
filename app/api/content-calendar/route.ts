import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createContentCalendarSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string(),
  channel: z.string(),
  scheduledDate: z.string().datetime(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  authorId: z.string(),
  approvedBy: z.string().optional(),
});

/**
 * GET /api/content-calendar
 * List content calendar entries
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
      await logAuditAction(
        userId,
        "read",
        "content_calendar",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const entries = await prisma.contentCalendarEntry.findMany({
      where: {
        campaign: { organizationId: orgId },
        ...(campaignId && { campaignId }),
        ...(status && { status }),
        ...(channel && { channel }),
      },
      include: {
        campaign: true,
      },
      take: limit,
      skip: offset,
      orderBy: { scheduledDate: "asc" },
    });

    const total = await prisma.contentCalendarEntry.count({
      where: {
        campaign: { organizationId: orgId },
        ...(campaignId && { campaignId }),
        ...(status && { status }),
        ...(channel && { channel }),
      },
    });

    await logAuditAction(userId, "read", "content_calendar", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/content-calendar
 * Create a new content calendar entry
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
      await logAuditAction(
        userId,
        "create",
        "content_calendar",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createContentCalendarSchema.parse(body);

    // Verify campaign
    const campaign = await prisma.campaign.findFirst({
      where: { id: validated.campaignId, organizationId: orgId },
    });
    if (!campaign) {
      throw new ForbiddenError("Campaign not found");
    }

    const entry = await prisma.contentCalendarEntry.create({
      data: {
        campaignId: validated.campaignId,
        title: validated.title,
        content: validated.content,
        channel: validated.channel,
        scheduledDate: new Date(validated.scheduledDate),
        status: validated.status,
        authorId: validated.authorId,
        approvedBy: validated.approvedBy,
      },
      include: {
        campaign: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "content_calendar",
      entry.id,
      { entry },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: entry,
        message: "Content calendar entry created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
