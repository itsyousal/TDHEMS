import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET - Fetch all active menu items with variations and addons (public endpoint for order portal)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Fetch all active menu items with their variations and addons
    const menuItems = await prisma.sku.findMany({
      where: {
        orgId,
        isActive: true,
        status: 'active',
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

    // Group by category
    const grouped = menuItems.reduce((acc: Record<string, any[]>, item: any) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        basePrice: item.basePrice,
        description: item.description,
        image: item.image,
        variations: item.variations.map((v: { id: string; name: string; priceModifier: number }) => ({
          id: v.id,
          name: v.name,
          priceModifier: v.priceModifier
        })),
        addons: item.addons.map((a: { id: string; name: string; price: number }) => ({
          id: a.id,
          name: a.name,
          price: a.price
        }))
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Convert to array format
    const groupedArray = Object.entries(grouped).map(([category, items]) => ({
      category,
      items
    }));

    return NextResponse.json({
      items: menuItems.map((item: { id: string; code: string; name: string; category: string | null; basePrice: number; description: string | null; image: string | null; variations: any; addons: any }) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        basePrice: item.basePrice,
        description: item.description,
        image: item.image,
        variations: item.variations,
        addons: item.addons
      })),
      grouped: groupedArray
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}
