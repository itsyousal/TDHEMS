import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/equipment/[id]
 * Get a specific equipment record
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        locationRef: { select: { id: true, name: true } },
        maintenanceLogs: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const userOrg = await prisma.userOrgMap.findFirst({
      where: { user: { email: session.user.email } },
      select: { orgId: true },
    });

    if (!userOrg || equipment.orgId !== userOrg.orgId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Failed to fetch equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/equipment/[id]
 * Update equipment record
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const userOrg = await prisma.userOrgMap.findFirst({
      where: { user: { email: session.user.email } },
      select: { orgId: true },
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 403 }
      );
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!equipment || equipment.orgId !== userOrg.orgId) {
      return NextResponse.json(
        { error: 'Equipment not found or forbidden' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Update equipment
    const updated = await prisma.equipment.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.category && { category: body.category.trim() }),
        ...(body.manufacturer !== undefined && { manufacturer: body.manufacturer?.trim() || undefined }),
        ...(body.model !== undefined && { model: body.model?.trim() || undefined }),
        ...(body.serialNumber !== undefined && { serialNumber: body.serialNumber?.trim() || undefined }),
        ...(body.purchaseDate !== undefined && { purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined }),
        ...(body.purchaseCost !== undefined && { purchaseCost: body.purchaseCost ? parseFloat(body.purchaseCost) : undefined }),
        ...(body.installationDate !== undefined && { installationDate: body.installationDate ? new Date(body.installationDate) : undefined }),
        ...(body.warrantyExpiryDate !== undefined && { warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : undefined }),
        ...(body.lastMaintenanceDate !== undefined && { lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : undefined }),
        ...(body.nextMaintenanceDate !== undefined && { nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : undefined }),
        ...(body.status && { status: body.status }),
        ...(body.condition && { condition: body.condition }),
        ...(body.locationId !== undefined && { locationId: body.locationId || undefined }),
        ...(body.location !== undefined && { location: body.location?.trim() || undefined }),
        ...(body.capacity !== undefined && { capacity: body.capacity?.trim() || undefined }),
        ...(body.specifications !== undefined && { specifications: body.specifications || undefined }),
        ...(body.attachments !== undefined && { attachments: body.attachments?.trim() || undefined }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || undefined }),
      },
      include: {
        locationRef: { select: { id: true, name: true } },
        maintenanceLogs: {
          take: 1,
          orderBy: { startDate: 'desc' },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'Equipment',
        resourceId: id,
        status: 'success',
        changes: body,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update equipment:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/equipment/[id]
 * Delete equipment record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const userOrg = await prisma.userOrgMap.findFirst({
      where: { user: { email: session.user.email } },
      select: { orgId: true },
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 403 }
      );
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!equipment || equipment.orgId !== userOrg.orgId) {
      return NextResponse.json(
        { error: 'Equipment not found or forbidden' },
        { status: 404 }
      );
    }

    // Delete equipment (cascade will handle maintenance logs)
    await prisma.equipment.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'Equipment',
        resourceId: id,
        status: 'success',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete equipment:', error);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error?.message || JSON.stringify(error)
      : 'Failed to delete equipment';
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error : undefined },
      { status: 500 }
    );
  }
}
