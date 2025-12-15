import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/checklists/[id]
 * Get a single checklist with all items
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const canView = await hasPermission(userId, 'checklists.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Checklists view permission required.' },
        { status: 403 }
      );
    }

    const checklist = await prisma.checklist.findFirst({
      where: { id, orgId },
      include: {
        location: { select: { id: true, name: true } },
        items: {
          orderBy: { order: 'asc' },
        },
        runs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            evidence: true,
          },
        },
        _count: {
          select: { items: true, runs: true },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    // Check role access
    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (!canManage && checklist.roles.length > 0) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId, orgId },
        include: { role: { select: { slug: true } } },
      });
      const userRoleSlugs = userRoles.map((ur: { role: { slug: string } }) => ur.role.slug);
      
      if (!checklist.roles.some((role: string) => userRoleSlugs.includes(role))) {
        return NextResponse.json(
          { error: 'Access denied. You do not have the required role for this checklist.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('[CHECKLIST_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/checklists/[id]
 * Update a checklist
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Checklists manage permission required.' },
        { status: 403 }
      );
    }

    const existing = await prisma.checklist.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      frequency,
      dueTime,
      requiresPhotoEvidence,
      escalationTime,
      roles,
      locationId,
      isActive,
      items,
    } = body;

    // Update checklist and items in a transaction
    const checklist = await prisma.$transaction(async (tx) => {
      const updated = await tx.checklist.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(frequency !== undefined && { frequency }),
          ...(dueTime !== undefined && { dueTime }),
          ...(requiresPhotoEvidence !== undefined && { requiresPhotoEvidence }),
          ...(escalationTime !== undefined && {
            escalationTime: escalationTime ? parseInt(String(escalationTime)) : null,
          }),
          ...(roles !== undefined && { roles }),
          ...(locationId !== undefined && { locationId }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete removed items
        const existingItemIds = items.filter((i: any) => i.id).map((i: any) => i.id);
        await tx.checklistItem.deleteMany({
          where: {
            checklistId: id,
            id: { notIn: existingItemIds },
          },
        });

        // Update or create items
        for (const item of items) {
          if (item.id) {
            await tx.checklistItem.update({
              where: { id: item.id },
              data: {
                title: item.title,
                description: item.description || null,
                order: item.order,
                isRequired: item.isRequired !== false,
                roles: item.roles || [],
              },
            });
          } else {
            await tx.checklistItem.create({
              data: {
                checklistId: id,
                title: item.title,
                description: item.description || null,
                order: item.order,
                isRequired: item.isRequired !== false,
                roles: item.roles || [],
              },
            });
          }
        }
      }

      return tx.checklist.findUnique({
        where: { id },
        include: {
          items: { orderBy: { order: 'asc' } },
          location: { select: { id: true, name: true } },
        },
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'update',
        resource: 'checklist',
        resourceId: id,
        changes: body,
        status: 'success',
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('[CHECKLIST_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/checklists/[id]
 * Delete a checklist
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Checklists manage permission required.' },
        { status: 403 }
      );
    }

    const existing = await prisma.checklist.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    await prisma.checklist.delete({ where: { id } });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'delete',
        resource: 'checklist',
        resourceId: id,
        changes: { name: existing.name },
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CHECKLIST_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete checklist' },
      { status: 500 }
    );
  }
}
