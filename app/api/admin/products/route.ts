import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has admin permissions
    const roles = user.userRoles.map(ur => ur.role.slug);
    const isAdmin = roles.some(role => 
      ['owner-super-admin', 'general-manager'].includes(role)
    );

    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      category,
      basePrice,
      costPrice,
      unit,
      weight,
      inventoryType,
      status,
    } = body;

    // Validate required fields
    if (!code || !name || !basePrice || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, basePrice, unit' },
        { status: 400 }
      );
    }

    // Get user's organization
    const userOrg = user.userRoles[0]?.orgId;
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found for user' }, { status: 400 });
    }

    // Check if SKU code already exists
    const existingSku = await prisma.sku.findUnique({
      where: {
        orgId_code: {
          orgId: userOrg,
          code: code,
        },
      },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: 'Product code already exists' },
        { status: 409 }
      );
    }

    // Create the SKU
    const newSku = await prisma.sku.create({
      data: {
        orgId: userOrg,
        code,
        name,
        description: description || null,
        category: category || null,
        basePrice: parseFloat(basePrice),
        costPrice: parseFloat(costPrice || basePrice),
        unit,
        weight: weight ? parseFloat(weight) : null,
        inventoryType: inventoryType || 'FINISHED',
        status: status || 'active',
        isActive: true,
      },
    });

    // Create inventory records for all locations in the organization
    const locations = await prisma.location.findMany({
      where: { orgId: userOrg },
    });

    if (locations.length > 0) {
      await prisma.inventory.createMany({
        data: locations.map(location => ({
          orgId: userOrg,
          locationId: location.id,
          skuId: newSku.id,
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      product: newSku,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userOrg = user.userRoles[0]?.orgId;
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const products = await prisma.sku.findMany({
      where: { orgId: userOrg },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
