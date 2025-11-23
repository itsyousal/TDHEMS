import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { logAuditAction } from "@/lib/audit";
import { ForbiddenError, ValidationError, handleApiError } from "@/lib/api-error";

const createExpenseSchema = z.object({
  category: z.enum(["SUPPLIES", "LABOR", "UTILITIES", "MAINTENANCE", "MARKETING", "OTHER"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  expenseDate: z.string().datetime(),
  vendor: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]),
  submittedBy: z.string(),
  approvedBy: z.string().optional(),
});

/**
 * GET /api/expenses
 * List expenses
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "finance.view", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "read", "expenses", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: orgId,
        ...(category && { category }),
        ...(status && { status }),
        ...(dateFrom || dateTo) && {
          expenseDate: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { expenseDate: "desc" },
    });

    const total = await prisma.expense.count({
      where: {
        organizationId: orgId,
        ...(category && { category }),
        ...(status && { status }),
      },
    });

    await logAuditAction(userId, "read", "expenses", null, { count: total }, "success");

    return NextResponse.json({
      success: true,
      data: expenses,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const orgId = request.headers.get("x-org-id");

    if (!userId || !orgId) {
      throw new ForbiddenError("Missing user or org context");
    }

    const hasAccess = await hasPermission(userId, "finance.create", orgId);
    if (!hasAccess) {
      await logAuditAction(userId, "create", "expenses", null, {}, "failure", "Permission denied");
      throw new ForbiddenError("Permission denied");
    }

    const body = await request.json();
    const validated = createExpenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        organizationId: orgId,
        category: validated.category,
        amount: validated.amount,
        description: validated.description,
        expenseDate: new Date(validated.expenseDate),
        vendor: validated.vendor,
        receiptUrl: validated.receiptUrl,
        status: validated.status,
        submittedBy: validated.submittedBy,
        approvedBy: validated.approvedBy,
      },
    });

    await logAuditAction(
      userId,
      "create",
      "expenses",
      expense.id,
      { expense },
      "success"
    );

    return NextResponse.json(
      {
        success: true,
        data: expense,
        message: "Expense created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const handled = handleApiError(error);
    return NextResponse.json(handled, { status: 500 });
  }
}
