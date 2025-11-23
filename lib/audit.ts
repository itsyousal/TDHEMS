// src/lib/audit.ts
import { prisma } from "./db";
import { headers } from "next/headers";

export async function logAuditAction(
  userId: string | null,
  action: "create" | "read" | "update" | "delete" | "export" | "approve" | "reject",
  resource: string,
  resourceId: string | null,
  changes?: Record<string, any>,
  status: "success" | "failure" = "success",
  errorMessage?: string
) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        changes,
        status,
        errorMessage,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

export async function getAuditLogs(
  filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  offset: number = 0
) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.resource && { resource: filters.resource }),
      ...(filters?.resourceId && { resourceId: filters.resourceId }),
      ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function getAuditLogsCount(filters?: Record<string, any>) {
  return prisma.auditLog.count({ where: filters });
}
