import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/checklists
 * List all checklists with filtering and pagination
 * Access: checklists.view permission required
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    // Check permission
    const canView = await hasPermission(userId, 'checklists.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Checklists view permission required.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const frequency = url.searchParams.get('frequency'); // daily, weekly, monthly
    const isActive = url.searchParams.get('isActive');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Get user roles to filter accessible checklists
    const userRoles = await prisma.userRole.findMany({
      where: { userId, orgId },
      include: { role: { select: { slug: true } } },
    });
    const userRoleSlugs = userRoles.map((ur: { role: { slug: string } }) => ur.role.slug);

    const where: any = { orgId };

    if (frequency) {
      where.frequency = frequency;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [checklists, total] = await Promise.all([
      prisma.checklist.findMany({
        where,
        include: {
          location: { select: { id: true, name: true } },
          items: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              isRequired: true,
              roles: true,
            },
          },
          _count: {
            select: {
              items: true,
              runs: true,
            },
          },
        },
        orderBy: [{ frequency: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.checklist.count({ where }),
    ]);

    // Filter by user roles - users can only see checklists assigned to their roles
    // or all checklists if they have admin permissions
    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    const filteredChecklists = canManage
      ? checklists
      : checklists.filter(
          (c: { roles: string[] }) =>
            c.roles.length === 0 || // Open to all
            c.roles.some((role: string) => userRoleSlugs.includes(role))
        );

    return NextResponse.json({
      data: filteredChecklists,
      canManage, // Include admin flag for frontend
      meta: {
        total,
        filtered: filteredChecklists.length,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[CHECKLISTS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklists' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checklists
 * Create a new checklist template
 * Access: checklists.manage permission required
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    // Check permission
    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Checklists manage permission required.' },
        { status: 403 }
      );
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
      items,
    } = body;

    // Validate required fields
    if (!name || !frequency) {
      return NextResponse.json(
        { error: 'Name and frequency are required' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly', 'shift_start', 'shift_end'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Create checklist with items in a transaction
    const checklist = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newChecklist = await tx.checklist.create({
        data: {
          orgId,
          name,
          description: description || null,
          frequency,
          dueTime: dueTime || null,
          requiresPhotoEvidence: requiresPhotoEvidence || false,
          escalationTime: escalationTime ? parseInt(String(escalationTime)) : null,
          roles: roles || [],
          locationId: locationId || null,
        },
      });

      // Create items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.checklistItem.createMany({
          data: items.map((item: any, index: number) => ({
            checklistId: newChecklist.id,
            title: item.title,
            description: item.description || null,
            order: item.order ?? index + 1,
            isRequired: item.isRequired !== false,
          })),
        });
      }

      return tx.checklist.findUnique({
        where: { id: newChecklist.id },
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
        action: 'create',
        resource: 'checklist',
        resourceId: checklist!.id,
        changes: { name, frequency, itemCount: items?.length || 0 },
        status: 'success',
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error('[CHECKLISTS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create checklist' },
      { status: 500 }
    );
  }
}
