import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/checklists/runs
 * List checklist runs with filtering
 */
export async function GET(request: Request) {
  try {
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

    const url = new URL(request.url);
    const checklistId = url.searchParams.get('checklistId');
    const status = url.searchParams.get('status'); // in_progress, completed, overdue, failed
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const myRuns = url.searchParams.get('myRuns') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    const where: any = {
      checklist: { orgId },
    };

    if (checklistId) {
      where.checklistId = checklistId;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom) {
      where.startedAt = { ...where.startedAt, gte: new Date(dateFrom) };
    }

    if (dateTo) {
      where.startedAt = { ...where.startedAt, lte: new Date(dateTo) };
    }

    if (myRuns) {
      where.userId = userId;
    }

    const [runs, total] = await Promise.all([
      prisma.checklistRun.findMany({
        where,
        include: {
          checklist: {
            select: {
              id: true,
              name: true,
              frequency: true,
              requiresPhotoEvidence: true,
              _count: { select: { items: true } },
            },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          evidence: {
            include: {
              item: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.checklistRun.count({ where }),
    ]);

    // Calculate completion rates
    const runsWithProgress = runs.map((run) => {
      const totalItems = run.checklist._count.items;
      const completedItems = run.evidence.filter((e) => e.checked).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...run,
        progress,
        completedItems,
        totalItems,
      };
    });

    return NextResponse.json({
      data: runsWithProgress,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[CHECKLIST_RUNS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist runs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checklists/runs
 * Start a new checklist run
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    const canExecute = await hasPermission(userId, 'checklists.execute', orgId);
    if (!canExecute) {
      return NextResponse.json(
        { error: 'Access denied. Checklists execute permission required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { checklistId } = body;

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Checklist ID is required' },
        { status: 400 }
      );
    }

    // Verify checklist exists and user has access
    const checklist = await prisma.checklist.findFirst({
      where: { id: checklistId, orgId, isActive: true },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist not found or inactive' },
        { status: 404 }
      );
    }

    // Check role access
    if (checklist.roles.length > 0) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId, orgId },
        include: { role: { select: { slug: true } } },
      });
      const userRoleSlugs = userRoles.map((ur: { role: { slug: string } }) => ur.role.slug);
      
      if (!checklist.roles.some((role: string) => userRoleSlugs.includes(role))) {
        return NextResponse.json(
          { error: 'You do not have the required role for this checklist.' },
          { status: 403 }
        );
      }
    }

    // Check for existing in-progress run for this checklist today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingRun = await prisma.checklistRun.findFirst({
      where: {
        checklistId,
        userId,
        status: 'in_progress',
        startedAt: { gte: today, lt: tomorrow },
      },
    });

    if (existingRun) {
      // Return existing run instead of creating new one
      return NextResponse.json({
        run: existingRun,
        checklist,
        message: 'Resuming existing run',
      });
    }

    // Create new run with evidence placeholders
    const run = await prisma.$transaction(async (tx) => {
      const newRun = await tx.checklistRun.create({
        data: {
          checklistId,
          userId,
          status: 'in_progress',
        },
      });

      // Create evidence records for each item
      if (checklist.items.length > 0) {
        await tx.checklistEvidence.createMany({
          data: checklist.items.map((item) => ({
            itemId: item.id,
            runId: newRun.id,
            checked: false,
          })),
        });
      }

      return tx.checklistRun.findUnique({
        where: { id: newRun.id },
        include: {
          evidence: {
            include: {
              item: true,
            },
            orderBy: { item: { order: 'asc' } },
          },
        },
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'create',
        resource: 'checklist_run',
        resourceId: run!.id,
        changes: { checklistId, checklistName: checklist.name },
        status: 'success',
      },
    });

    return NextResponse.json({
      run,
      checklist,
      message: 'Checklist run started',
    }, { status: 201 });
  } catch (error) {
    console.error('[CHECKLIST_RUNS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to start checklist run' },
      { status: 500 }
    );
  }
}
