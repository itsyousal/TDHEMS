import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { jsonResponse, jsonErrorResponse, ERROR_CODES, successResponse } from '@/lib/api-response';
import { InventoryType } from '@prisma/client';

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.organizationId) {
    return jsonErrorResponse(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { code, name, unit, basePrice, category, isActive, locations } = body;

    if (!code || !code.trim()) {
      return jsonErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'SKU code is required', 400, { field: 'code' });
    }

    if (!name || !name.trim()) {
      return jsonErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'SKU name is required', 400, { field: 'name' });
    }

    const orgId = session.user.organizationId;

    // Prevent duplicate SKU codes within org
    const existing = await prisma.sku.findFirst({ where: { orgId, code } });
    if (existing) {
      return jsonErrorResponse(ERROR_CODES.CONFLICT, 'SKU code already exists', 409, { field: 'code' });
    }

    // Map category to InventoryType
    const inventoryType = category === 'raw' ? InventoryType.RAW : InventoryType.FINISHED;

    const sku = await prisma.sku.create({
      data: {
        orgId,
        code: code.trim(),
        name: name.trim(),
        unit: unit || 'units',
        basePrice: typeof basePrice === 'number' ? basePrice : parseFloat(basePrice) || 0,
        costPrice: typeof basePrice === 'number' ? basePrice : parseFloat(basePrice) || 0,
        category: category || undefined,
        isActive: isActive !== false,
        inventoryType,
      },
    });

    // Create initial inventory records if locations provided
    if (Array.isArray(locations) && locations.length > 0) {
      for (const loc of locations) {
        try {
          if (!loc.locationId) continue;
          const existingInv = await prisma.inventory.findFirst({ where: { locationId: loc.locationId, skuId: sku.id } });
          if (existingInv) {
            await prisma.inventory.update({
              where: { id: existingInv.id },
              data: {
                quantity: loc.currentStock ?? existingInv.quantity,
                availableQuantity: loc.currentStock ?? existingInv.availableQuantity,
                reorderLevel: typeof loc.reorderPoint !== 'undefined' ? loc.reorderPoint : existingInv.reorderLevel,
                reorderQuantity: typeof loc.reorderQuantity !== 'undefined' ? loc.reorderQuantity : existingInv.reorderQuantity,
              },
            });
          } else {
            await prisma.inventory.create({
              data: {
                orgId,
                locationId: loc.locationId,
                skuId: sku.id,
                quantity: loc.currentStock ?? 0,
                reservedQuantity: 0,
                availableQuantity: loc.currentStock ?? 0,
                reorderLevel: typeof loc.reorderPoint !== 'undefined' ? loc.reorderPoint : undefined,
                reorderQuantity: typeof loc.reorderQuantity !== 'undefined' ? loc.reorderQuantity : undefined,
              },
            });
          }
        } catch (err) {
          console.warn('Failed to create inventory for location', loc, err);
        }
      }
    }

    // Return legacy/simple shape expected by existing client code: { sku: {...} }
    return new Response(JSON.stringify({ sku }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[INVENTORY_SKU_CREATE_POST]', error);
    return jsonErrorResponse(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to create SKU', 500);
  }
}
