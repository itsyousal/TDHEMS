import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.string(),
  condition: z.record(z.string(), z.any()),
  action: z.string(),
  actionPayload: z.record(z.string(), z.any()),
  enabled: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

/**
 * GET /api/rules
 * List automation rules
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "automation.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "rules", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get("enabled");
    const priority = searchParams.get("priority");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const rules = await prisma.automationRule.findMany({
      where: {
        organizationId: orgId,
        ...(enabled !== null && { enabled: enabled === "true" }),
        ...(priority && { priority }),
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.automationRule.count({
      where: {
        organizationId: orgId,
        ...(enabled !== null && { enabled: enabled === "true" }),
        ...(priority && { priority }),
      },
    });

    await logAuditAction(userId, "read", "rules", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: rules,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/rules
 * Create a new automation rule
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "automation.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "rules", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createRuleSchema.parse(body);

    const rule = await prisma.automationRule.create({
      data: {
        organizationId: orgId,
        name: validated.name,
        description: validated.description,
        trigger: validated.trigger,
        condition: validated.condition,
        action: validated.action,
        actionPayload: validated.actionPayload,
        enabled: validated.enabled,
        requiresApproval: validated.requiresApproval,
        priority: validated.priority,
        createdBy: userId,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "rules",
      rule.id,
      { rule },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: rule,
        message: "Automation rule created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
