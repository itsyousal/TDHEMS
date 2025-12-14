import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission - handle both array and undefined cases
    const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
    const userPermissions = Array.isArray(session.user.permissions) ? session.user.permissions : [];
    
    const isAdmin =
      userRoles.includes('owner-super-admin') ||
      userPermissions.includes('admin.manage_users');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle params that might be a Promise in Next.js 16
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user with all their roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        userRoles: {
          select: {
            id: true,
            roleId: true,
            orgId: true,
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all available roles
    const allRoles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      user,
      availableRoles: allRoles,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch user permissions', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission - handle both array and undefined cases
    const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
    const userPermissions = Array.isArray(session.user.permissions) ? session.user.permissions : [];
    
    const isAdmin =
      userRoles.includes('owner-super-admin') ||
      userPermissions.includes('admin.manage_users');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle params that might be a Promise in Next.js 16
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { roleIds, orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Remove existing roles for this org
    await prisma.userRole.deleteMany({
      where: {
        userId,
        orgId,
      },
    });

    // Add new roles
    if (roleIds && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId,
          roleId,
          orgId,
        })),
      });
    }

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        resource: 'user_roles',
        resourceId: userId,
        changes: { roleIds, orgId },
        status: 'success',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update user permissions', details: errorMessage },
      { status: 500 }
    );
  }
}
