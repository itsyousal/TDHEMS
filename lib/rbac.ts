// src/lib/rbac.ts
import { prisma } from "./db";

export async function hasPermission(
  userId: string,
  permissionSlug: string,
  orgId?: string,
  locationId?: string
): Promise<boolean> {
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles || !userWithRoles.isActive) {
      return false;
    }

    const relevantRoles = orgId
      ? userWithRoles.userRoles.filter((ur: any) => ur.orgId === orgId)
      : userWithRoles.userRoles;

    if (locationId) {
      const filtered = relevantRoles.filter((ur: any) => !ur.locationId || ur.locationId === locationId);
      if (filtered.length === 0) return false;
    }

    for (const userRole of relevantRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.slug === permissionSlug) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("RBAC check error:", error);
    return false;
  }
}

export async function getUserRoles(userId: string, orgId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      orgId,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return userRoles;
}

export async function getUserPermissions(userId: string, orgId: string) {
  const permissions = new Set<string>();

  const userRoles = await getUserRoles(userId, orgId);

  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.slug);
    }
  }

  return Array.from(permissions);
}
