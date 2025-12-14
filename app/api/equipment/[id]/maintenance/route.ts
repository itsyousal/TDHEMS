import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/equipment/[id]/maintenance
 * Get maintenance logs for equipment
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

    // Verify equipment ownership
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

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

    const maintenanceLogs = await prisma.equipmentMaintenance.findMany({
      where: { equipmentId: id },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(maintenanceLogs);
  } catch (error) {
    console.error('Failed to fetch maintenance logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/equipment/[id]/maintenance
 * Add maintenance log
 */
export async function POST(
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

    // Verify equipment ownership
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

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

    const body = await request.json();

    if (!body.maintenanceType || !body.description || !body.startDate) {
      return NextResponse.json(
        { error: 'maintenanceType, description, and startDate are required' },
        { status: 400 }
      );
    }

    // Create maintenance log
    const log = await prisma.equipmentMaintenance.create({
      data: {
        equipmentId: id,
        maintenanceType: body.maintenanceType,
        description: body.description.trim(),
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        cost: body.cost ? parseFloat(body.cost) : undefined,
        partsReplaced: body.partsReplaced?.trim() || undefined,
        notes: body.notes?.trim() || undefined,
        performedBy: body.performedBy || session.user.id || undefined,
      },
    });

    // Update equipment's lastMaintenanceDate if provided
    if (body.endDate || body.startDate) {
      await prisma.equipment.update({
        where: { id },
        data: {
          lastMaintenanceDate: body.endDate ? new Date(body.endDate) : new Date(body.startDate),
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'EquipmentMaintenance',
        resourceId: log.id,
        status: 'success',
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create maintenance log:', error);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error?.message || JSON.stringify(error)
      : 'Failed to create maintenance log';
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error : undefined },
      { status: 500 }
    );
  }
}
