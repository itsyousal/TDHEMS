import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/db';

// GET - Fetch variations and addons for a product
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const skuId = searchParams.get('skuId');

    if (!skuId) {
      return NextResponse.json({ error: 'SKU ID is required' }, { status: 400 });
    }

    // Get user's organization
    const userOrgMap = await prisma.userOrgMap.findFirst({
      where: { userId }
    });

    if (!userOrgMap) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 403 });
    }

    // Verify the SKU belongs to the user's organization
    const sku = await prisma.sku.findFirst({
      where: {
        id: skuId,
        orgId: userOrgMap.orgId
      }
    });

    if (!sku) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch variations and addons
    const [variations, addons] = await Promise.all([
      prisma.productVariation.findMany({
        where: { skuId },
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.productAddon.findMany({
        where: { skuId },
        orderBy: { sortOrder: 'asc' }
      })
    ]);

    return NextResponse.json({ variations, addons }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product options' },
      { status: 500 }
    );
  }
}

// POST - Create variation or addon
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });

    const hasPermission = userRoles.some(ur => 
      ur.role.slug === 'owner-super-admin' || ur.role.slug === 'general-manager'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { skuId, type, name, priceModifier, price, sortOrder } = body;

    if (!skuId || !type || !name) {
      return NextResponse.json({ error: 'SKU ID, type, and name are required' }, { status: 400 });
    }

    // Get user's organization
    const userOrgMap = await prisma.userOrgMap.findFirst({
      where: { userId }
    });

    if (!userOrgMap) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 403 });
    }

    // Verify the SKU belongs to the user's organization
    const sku = await prisma.sku.findFirst({
      where: {
        id: skuId,
        orgId: userOrgMap.orgId
      }
    });

    if (!sku) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let result;
    if (type === 'variation') {
      result = await prisma.productVariation.create({
        data: {
          skuId,
          name,
          priceModifier: priceModifier ? parseFloat(priceModifier) : 0,
          sortOrder: sortOrder || 0
        }
      });
    } else if (type === 'addon') {
      result = await prisma.productAddon.create({
        data: {
          skuId,
          name,
          price: price ? parseFloat(price) : 0,
          sortOrder: sortOrder || 0
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "variation" or "addon"' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `${type} created successfully`,
      data: result 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product option:', error);
    return NextResponse.json(
      { error: 'Failed to create product option' },
      { status: 500 }
    );
  }
}

// PUT - Update variation or addon
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });

    const hasPermission = userRoles.some(ur => 
      ur.role.slug === 'owner-super-admin' || ur.role.slug === 'general-manager'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { id, type, name, priceModifier, price, sortOrder, isActive } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    let result;
    if (type === 'variation') {
      result = await prisma.productVariation.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(priceModifier !== undefined && { priceModifier: parseFloat(priceModifier) }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive })
        }
      });
    } else if (type === 'addon') {
      result = await prisma.productAddon.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive })
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "variation" or "addon"' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `${type} updated successfully`,
      data: result 
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating product option:', error);
    return NextResponse.json(
      { error: 'Failed to update product option' },
      { status: 500 }
    );
  }
}

// DELETE - Remove variation or addon
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });

    const hasPermission = userRoles.some(ur => 
      ur.role.slug === 'owner-super-admin' || ur.role.slug === 'general-manager'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    if (type === 'variation') {
      await prisma.productVariation.delete({
        where: { id }
      });
    } else if (type === 'addon') {
      await prisma.productAddon.delete({
        where: { id }
      });
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "variation" or "addon"' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `${type} removed successfully`
    }, { status: 200 });
  } catch (error) {
    console.error('Error removing product option:', error);
    return NextResponse.json(
      { error: 'Failed to remove product option' },
      { status: 500 }
    );
  }
}
