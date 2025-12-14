import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to view users for password reset
    const hasPermission =
      session.user.permissions?.includes('user.reset_password') ||
      session.user.permissions?.includes('admin.manage_users') ||
      session.user.roles?.includes('owner-super-admin') ||
      session.user.roles?.includes('general-manager') ||
      session.user.roles?.includes('hr-people-ops');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch all users with their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
