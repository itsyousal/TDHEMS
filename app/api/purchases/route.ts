import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

/**
 * POST /api/purchases
 * Payload: { orgId, locationId, items: [{ skuName|skuId, quantity, unitPrice }] }
 * This endpoint will create SKUs if absent and increment inventory for the given location.
 */
export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orgId, locationId, items } = body;
    if (!orgId || !locationId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const created = [];
    for (const it of items) {
      let sku = null;
      if (it.skuId) {
        sku = await prisma.sku.findUnique({ where: { id: it.skuId } }).catch(() => null);
      }
      if (!sku && it.skuName) {
        sku = await prisma.sku.findFirst({ where: { orgId, name: it.skuName } }).catch(() => null);
      }
      if (!sku) {
        sku = await prisma.sku.create({ data: { orgId, code: `SKU-${Date.now()}`, name: it.skuName || 'Unknown', unit: it.unit || 'unit', basePrice: it.unitPrice || 0, costPrice: it.unitPrice || 0 } });
      }

      // Upsert inventory for this sku/location
      const invKey = { locationId: locationId, skuId: sku.id };
      // Prisma compound unique name not defined in schema for findUnique, so use findFirst
      let inventory = await prisma.inventory.findFirst({ where: { locationId, skuId: sku.id } });
      if (!inventory) {
        inventory = await prisma.inventory.create({ data: { orgId, locationId, skuId: sku.id, quantity: it.quantity || 0, availableQuantity: it.quantity || 0 } });
      } else {
        inventory = await prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: inventory.quantity + (it.quantity || 0), availableQuantity: inventory.availableQuantity + (it.quantity || 0) } });
      }

      created.push({ skuId: sku.id, inventoryId: inventory.id });
    }

    return NextResponse.json({ success: true, created });
  } catch (error) {
    console.error('[PURCHASES_POST]', error);
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}
