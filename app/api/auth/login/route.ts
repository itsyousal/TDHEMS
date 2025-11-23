import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/audit";
import { UnauthorizedError, handleApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validated = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      await logAuditAction("system", "read", "users", null, {}, "failure", "User not found");
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if active
    if (!user.isActive) {
      await logAuditAction(user.id, "read", "auth", null, {}, "failure", "User account not activated");
      throw new UnauthorizedError("Your account has not been activated yet");
    }

    // Check password
    const passwordMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!passwordMatch) {
      await logAuditAction(user.id, "read", "auth", null, {}, "failure", "Invalid password");
      throw new UnauthorizedError("Invalid email or password");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log successful login
    await logAuditAction(user.id, "create", "auth_session", user.id, {}, "success");

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    const handled = handleApiError(error);
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(handled, { status });
  }
}
  }
}
