// Utility functions for authentication and session management
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Returns the current session. In development, if `DEV_AUTH_EMAIL` is set,
 * a fake session is returned to allow testing without a working DB.
 */
export interface DoughHouseSession extends Session {
  user: Session["user"] & {
    id?: string;
    organizationId?: string | null;
    roles?: string[];
    permissions?: string[];
  };
}

export async function getAuthSession(): Promise<DoughHouseSession | null> {
  try {
    const session = (await getServerSession(authOptions)) as DoughHouseSession | null;
    if (session) {
      return session;
    }

    // Development fallback: allow an env-provided dev account
    if (process.env.NODE_ENV !== "production") {
      const devEmail = process.env.DEV_AUTH_EMAIL || "admin@doughhouse.local";
      if (devEmail) {
        return {
          user: {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Dev Admin",
            email: devEmail,
            roles: ["owner-super-admin"],
            organizationId: process.env.DEV_ORG_ID || null,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } as DoughHouseSession;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(): Promise<DoughHouseSession> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createUserSession(userId: string) {
  // Session is managed by NextAuth in production
  return { userId };
}

export async function logAuditAction(
  userId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  meta: any = {},
  status: string = "success",
  message?: string
) {
  // Stubbed for now — real implementation uses prisma in audit.ts
  return true;
}
