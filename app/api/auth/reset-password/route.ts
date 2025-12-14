import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logAuditAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to reset passwords (admin or hr)
    const hasPermission = session.user.permissions?.includes('user.reset_password') ||
      session.user.permissions?.includes('admin.manage_users') ||
      session.user.roles?.includes('admin') ||
      session.user.roles?.includes('hr');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to reset passwords' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Create audit log
    await logAuditAction(
      session.user.id || '',
      'update',
      'user',
      userId,
      { action: 'password_reset', email: updatedUser.email },
      'success'
    );

    return NextResponse.json({
      success: true,
      message: `Password reset for ${updatedUser.firstName} ${updatedUser.lastName}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
