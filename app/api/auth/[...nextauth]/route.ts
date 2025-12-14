import NextAuth, { type NextAuthOptions, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import type { Prisma } from "@prisma/client";

type PrismaUserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true;
      };
    };
  };
}>;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = (await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        })) as PrismaUserWithRoles | null;

        if (!user) {
          throw new Error("User not found");
        }

        // Check if user is active (staged hiring check)
        if (!user.isActive) {
          throw new Error("User account is not active");
        }

        // Check password (use `password` field from Prisma User model)
        const hash = user.password ?? "";
        const passwordMatch = await bcrypt.compare(credentials.password, hash);
        if (!passwordMatch) {
          throw new Error("Invalid password");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        // Return user object with roles and permissions
        const roles = user.userRoles.map((ur) => ur.role);
        const roleNames = roles.map((role) => role.slug);

        // Fetch permissions for these roles
        const permissions = await prisma.permission.findMany({
          where: {
            rolePermissions: {
              some: {
                roleId: { in: roles.map((role) => role.id) }
              }
            }
          },
          select: { slug: true }
        });

        const permissionSlugs = permissions.map(p => p.slug);
        const organizationId = user.userRoles[0]?.orgId ?? null;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: roleNames,
          permissions: permissionSlugs,
          organizationId,
        } as User;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      const extendedToken = token as ExtendedToken;
      if (user) {
        const authUser = user as AuthUserClaims;
        extendedToken.id = authUser.id;
        extendedToken.email = authUser.email;
        extendedToken.firstName = authUser.firstName;
        extendedToken.lastName = authUser.lastName;
        extendedToken.organizationId = authUser.organizationId ?? null;
        extendedToken.roles = authUser.roles;
        extendedToken.permissions = authUser.permissions;
      }
      return extendedToken;
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedToken;
      if (session.user) {
        const sessionUser = session.user as AuthUserClaims;
        sessionUser.id = extendedToken.id;
        sessionUser.email = extendedToken.email;
        sessionUser.firstName = extendedToken.firstName;
        sessionUser.lastName = extendedToken.lastName;
        sessionUser.organizationId = extendedToken.organizationId;
        sessionUser.roles = extendedToken.roles;
        sessionUser.permissions = extendedToken.permissions;
      }
      return session;
    },
  },
};

type ExtendedToken = JWT & {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  organizationId?: string | null;
  roles?: string[];
  permissions?: string[];
};

type AuthUserClaims = {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  organizationId?: string | null;
  roles?: string[];
  permissions?: string[];
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
