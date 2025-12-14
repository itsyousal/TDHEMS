import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/db';

// GET - Fetch all menu items (SKUs with category 'menu')
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const userOrgMap = await prisma.userOrgMap.findFirst({
      where: { userId },
      include: { org: true }
    });

    if (!userOrgMap) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 403 });
    }

    // Fetch all menu items for this organization with variations and addons
    const menuItems = await prisma.sku.findMany({
      where: {
        orgId: userOrgMap.orgId,
        isActive: true,
      },
      include: {
        variations: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        addons: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ menuItems }, { status: 200 });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

// PUT - Update a menu item
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
    const { id, code, name, description, category, basePrice, costPrice, unit, weight, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 });
    }

    // Get user's organization
    const userOrgMap = await prisma.userOrgMap.findFirst({
      where: { userId }
    });

    if (!userOrgMap) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 403 });
    }

    // Verify the SKU belongs to the user's organization
    const existingSku = await prisma.sku.findFirst({
      where: {
        id,
        orgId: userOrgMap.orgId
      }
    });

    if (!existingSku) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingSku.code) {
      const duplicate = await prisma.sku.findFirst({
        where: {
          orgId: userOrgMap.orgId,
          code,
          id: { not: id }
        }
      });

      if (duplicate) {
        return NextResponse.json({ error: 'A menu item with this code already exists' }, { status: 409 });
      }
    }

    // Update the SKU
    const updatedSku = await prisma.sku.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(basePrice && { basePrice: parseFloat(basePrice) }),
        ...(costPrice && { costPrice: parseFloat(costPrice) }),
        ...(unit && { unit }),
        ...(weight && { weight: parseFloat(weight) }),
        ...(status && { status }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Menu item updated successfully',
      menuItem: updatedSku 
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a menu item (soft delete)
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

    if (!id) {
      return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 });
    }

    // Get user's organization
    const userOrgMap = await prisma.userOrgMap.findFirst({
      where: { userId }
    });

    if (!userOrgMap) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 403 });
    }

    // Verify the SKU belongs to the user's organization
    const existingSku = await prisma.sku.findFirst({
      where: {
        id,
        orgId: userOrgMap.orgId
      }
    });

    if (!existingSku) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.sku.update({
      where: { id },
      data: {
        isActive: false,
        status: 'discontinued',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Menu item removed successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error removing menu item:', error);
    return NextResponse.json(
      { error: 'Failed to remove menu item' },
      { status: 500 }
    );
  }
}
