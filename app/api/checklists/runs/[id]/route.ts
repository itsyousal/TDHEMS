import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/checklists/runs/[id]
 * Get a specific checklist run with full details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await params;

    const canView = await hasPermission(userId, 'checklists.view', orgId);
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied. Checklists view permission required.' },
        { status: 403 }
      );
    }

    const run = await prisma.checklistRun.findFirst({
      where: { id, checklist: { orgId } },
      include: {
        checklist: {
          include: {
            items: { orderBy: { order: 'asc' } },
            location: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        evidence: {
          include: {
            item: true,
          },
          orderBy: { item: { order: 'asc' } },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Calculate progress
    const totalItems = run.checklist.items.length;
    const completedItems = run.evidence.filter((e) => e.checked).length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      ...run,
      progress,
      completedItems,
      totalItems,
    });
  } catch (error) {
    console.error('[CHECKLIST_RUN_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist run' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/checklists/runs/[id]
 * Update checklist run (complete items, add notes, upload evidence)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await params;

    const canExecute = await hasPermission(userId, 'checklists.execute', orgId);
    if (!canExecute) {
      return NextResponse.json(
        { error: 'Access denied. Checklists execute permission required.' },
        { status: 403 }
      );
    }

    const run = await prisma.checklistRun.findFirst({
      where: { id, checklist: { orgId } },
      include: {
        checklist: {
          include: { items: true },
        },
        evidence: true,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Fetch checklist with photo evidence requirement
    const checklistDetails = await prisma.checklist.findUnique({
      where: { id: run.checklistId },
      select: { requiresPhotoEvidence: true },
    });
    const requiresPhotoEvidence = checklistDetails?.requiresPhotoEvidence || false;

    // Only the user who started the run or a manager can update it
    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (run.userId !== userId && !canManage) {
      return NextResponse.json(
        { error: 'You can only update your own checklist runs.' },
        { status: 403 }
      );
    }

    if (run.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot modify a completed checklist run.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, itemId, checked, note, photoUrl, status } = body;

    if (action === 'complete_item') {
      // Update a single item's evidence
      if (!itemId) {
        return NextResponse.json(
          { error: 'Item ID is required for complete_item action' },
          { status: 400 }
        );
      }

      // Verify item belongs to checklist
      const item = run.checklist.items.find((i) => i.id === itemId);
      if (!item) {
        return NextResponse.json(
          { error: 'Item not found in this checklist' },
          { status: 404 }
        );
      }

      // Check if photo required (based on checklist-level setting and item isRequired)
      const requiresPhoto = requiresPhotoEvidence && item.isRequired;
      if (requiresPhoto && checked && !photoUrl) {
        return NextResponse.json(
          { error: 'Photo evidence is required for this item' },
          { status: 400 }
        );
      }

      await prisma.checklistEvidence.updateMany({
        where: { runId: id, itemId },
        data: {
          checked: checked ?? false,
          notes: note ?? null,
          fileUrl: photoUrl ?? null,
        },
      });
    } else if (action === 'complete_run') {
      // Complete the entire run
      const allItems = run.checklist.items;
      const evidence = await prisma.checklistEvidence.findMany({
        where: { runId: id },
      });

      const uncheckedItems = allItems.filter(
        (item) => !evidence.find((e) => e.itemId === item.id && e.checked)
      );

      // Check for required photos (checklist-level photo requirement)
      const missingPhotos = requiresPhotoEvidence ? allItems.filter((item) => {
        if (!item.isRequired) return false;
        const ev = evidence.find((e) => e.itemId === item.id);
        return ev?.checked && !ev.fileUrl;
      }) : [];

      if (missingPhotos.length > 0) {
        return NextResponse.json({
          error: 'Some items require photo evidence',
          missingPhotos: missingPhotos.map((i) => ({ id: i.id, title: i.title })),
        }, { status: 400 });
      }

      // Allow completion even with unchecked items but mark appropriately
      const completedItems = evidence.filter((e) => e.checked).length;
      const completionRate = allItems.length > 0 
        ? Math.round((completedItems / allItems.length) * 100) 
        : 100;

      const finalStatus = uncheckedItems.length > 0 ? 'failed' : 'completed';

      await prisma.checklistRun.update({
        where: { id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'update',
          resource: 'checklist_run',
          resourceId: id,
          changes: {
            status: finalStatus,
            completionRate,
            completedItems,
            totalItems: allItems.length,
          },
          status: 'success',
        },
      });

      return NextResponse.json({
        message: finalStatus === 'completed' 
          ? 'Checklist completed successfully!' 
          : 'Checklist submitted with incomplete items.',
        status: finalStatus,
        completionRate,
        uncheckedItems: uncheckedItems.map((i) => ({ id: i.id, title: i.title })),
      });
    } else if (status) {
      // Direct status update (for managers)
      if (!canManage) {
        return NextResponse.json(
          { error: 'Only managers can directly update run status' },
          { status: 403 }
        );
      }

      await prisma.checklistRun.update({
        where: { id },
        data: {
          status,
          completedAt: ['completed', 'failed'].includes(status) ? new Date() : null,
        },
      });
    }

    // Return updated run
    const updatedRun = await prisma.checklistRun.findUnique({
      where: { id },
      include: {
        checklist: {
          include: { items: { orderBy: { order: 'asc' } } },
        },
        evidence: {
          include: { item: true },
          orderBy: { item: { order: 'asc' } },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const totalItems = updatedRun?.checklist.items.length || 0;
    const completedItems = updatedRun?.evidence.filter((e) => e.checked).length || 0;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      ...updatedRun,
      progress,
      completedItems,
      totalItems,
    });
  } catch (error) {
    console.error('[CHECKLIST_RUN_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update checklist run' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/checklists/runs/[id]
 * Delete/cancel a checklist run (managers only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;
    const { id } = await params;

    const canManage = await hasPermission(userId, 'checklists.manage', orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. Checklists manage permission required.' },
        { status: 403 }
      );
    }

    const run = await prisma.checklistRun.findFirst({
      where: { id, checklist: { orgId } },
      include: { checklist: true },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Delete evidence first due to relations
    await prisma.checklistEvidence.deleteMany({ where: { runId: id } });
    await prisma.checklistRun.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'delete',
        resource: 'checklist_run',
        resourceId: id,
        changes: { checklistName: run.checklist.name },
        status: 'success',
      },
    });

    return NextResponse.json({ message: 'Checklist run deleted successfully' });
  } catch (error) {
    console.error('[CHECKLIST_RUN_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete checklist run' },
      { status: 500 }
    );
  }
}
