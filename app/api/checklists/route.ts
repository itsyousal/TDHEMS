import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createChecklistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["SAFETY", "QUALITY", "CLEANING", "AUDIT", "MAINTENANCE", "OTHER"]),
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      required: z.boolean().default(true),
    })
  ),
  applicableTo: z.enum(["BATCH", "LOCATION", "EMPLOYEE", "EQUIPMENT"]),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

/**
 * GET /api/checklists
 * List checklists
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "quality.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "checklists", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const applicableTo = searchParams.get("applicableTo");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const checklists = await prisma.checklist.findMany({
      where: {
        organizationId: orgId,
        ...(category && { category }),
        ...(applicableTo && { applicableTo }),
        ...(status && { status }),
      },
      include: {
        items: true,
        runs: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.checklist.count({
      where: {
        organizationId: orgId,
        ...(category && { category }),
        ...(applicableTo && { applicableTo }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "checklists", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: checklists,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/checklists
 * Create a new checklist
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "quality.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "checklists", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createChecklistSchema.parse(body);

    const checklist = await prisma.checklist.create({
      data: {
        organizationId: orgId,
        name: validated.name,
        description: validated.description,
        category: validated.category,
        applicableTo: validated.applicableTo,
        status: validated.status,
        items: {
          create: validated.items,
        },
      },
      include: {
        items: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "checklists",
      checklist.id,
      { checklist },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: checklist,
        message: "Checklist created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
