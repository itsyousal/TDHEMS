import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/equipment
 * Retrieve all equipment for the user's organization with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const locationId = searchParams.get('locationId');
    const condition = searchParams.get('condition');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = { orgId: userOrg.orgId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (locationId) where.locationId = locationId;
    if (condition) where.condition = condition;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch equipment
    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        locationRef: { select: { id: true, name: true } },
        maintenanceLogs: {
          take: 1,
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
 * POST /api/equipment
 * Create a new equipment record
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
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

    const body = await request.json();
    
    // Validate required fields
    if (!body.code || !body.name || !body.category) {
      return NextResponse.json(
        { error: 'Code, name, and category are required' },
        { status: 400 }
      );
    }

    // Check if code already exists for this org
    const existing = await prisma.equipment.findFirst({
      where: { 
        orgId: userOrg.orgId, 
        code: body.code.trim().toUpperCase() 
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Equipment code already exists for this organization' },
        { status: 409 }
      );
    }

    // Get user ID for audit logging
    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
      select: { id: true },
    });

    // Create equipment
    const equipment = await prisma.equipment.create({
      data: {
        orgId: userOrg.orgId,
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        category: body.category.trim(),
        manufacturer: body.manufacturer?.trim() || undefined,
        model: body.model?.trim() || undefined,
        serialNumber: body.serialNumber?.trim() || undefined,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        purchaseCost: body.purchaseCost ? parseFloat(body.purchaseCost) : undefined,
        installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
        warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : undefined,
        locationId: body.locationId || undefined,
        status: body.status || 'active',
        condition: body.condition || 'good',
        location: body.location?.trim() || undefined,
        capacity: body.capacity?.trim() || undefined,
        specifications: body.specifications || undefined,
        attachments: body.attachments?.trim() || undefined,
        notes: body.notes?.trim() || undefined,
        createdBy: user?.id,
      },
      include: {
        locationRef: { select: { id: true, name: true } },
      },
    });

    // Audit log
    if (user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'Equipment',
          resourceId: equipment.id,
          status: 'success',
        },
      });
    }

    return NextResponse.json(equipment, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create equipment:', error);
    
    // Return detailed error info in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error?.message || JSON.stringify(error)
      : 'Failed to create equipment';
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error : undefined },
      { status: 500 }
    );
  }
}
