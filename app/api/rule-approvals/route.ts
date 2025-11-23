import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createRuleApprovalSchema = z.object({
  ruleId: z.string().uuid(),
  executionId: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  approvalNotes: z.string().optional(),
  requestedBy: z.string(),
  approvedBy: z.string().optional(),
});

/**
 * GET /api/rule-approvals
 * List rule approvals
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
      await logAuditAction(
        userId,
        "read",
        "rule_approvals",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const approvals = await prisma.ruleApproval.findMany({
      where: {
        rule: { organizationId: orgId },
        ...(ruleId && { ruleId }),
        ...(status && { status }),
      },
      include: {
        rule: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.ruleApproval.count({
      where: {
        rule: { organizationId: orgId },
        ...(ruleId && { ruleId }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "rule_approvals", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: approvals,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/rule-approvals
 * Create a rule approval request
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
      await logAuditAction(
        userId,
        "create",
        "rule_approvals",
        null,
        {},
        "failure",
        "Permission denied"
      );
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createRuleApprovalSchema.parse(body);

    // Verify rule
    const rule = await prisma.automationRule.findFirst({
      where: { id: validated.ruleId, organizationId: orgId },
    });
    if (!rule) {
      throw new ForbiddenError("Rule not found");
    }

    const approval = await prisma.ruleApproval.create({
      data: {
        ruleId: validated.ruleId,
        executionId: validated.executionId,
        status: validated.status,
        approvalNotes: validated.approvalNotes,
        requestedBy: validated.requestedBy,
        approvedBy: validated.approvedBy,
      },
      include: {
        rule: true,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "rule_approvals",
      approval.id,
      { approval },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: approval,
        message: "Rule approval created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
