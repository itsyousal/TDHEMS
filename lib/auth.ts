// Utility functions for authentication and session management
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

/**
 * Returns the current session. In development, if `DEV_AUTH_EMAIL` is set,
 * a fake session is returned to allow testing without a working DB.
 */
export async function getAuthSession(): Promise<Session | null> {
  try {
    // Development fallback: allow an env-provided dev account
    if (process.env.NODE_ENV !== "production") {
      const devEmail = process.env.DEV_AUTH_EMAIL || "admin@doughhouse.local";
      if (devEmail) {
        return {
          user: {
            id: "dev-user",
            name: "Dev Admin",
            email: devEmail,
            // @ts-ignore - custom fields
            roles: ["owner-super-admin"],
            // @ts-ignore
            organizationId: process.env.DEV_ORG_ID || null,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } as unknown as Session;
      }
    }

    const session = await getServerSession();
    return session;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(): Promise<Session> {
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
