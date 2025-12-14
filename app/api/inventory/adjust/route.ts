import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sku, locationId, adjustment, reason } = body;

    if (!sku || !locationId || typeof adjustment !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const targetSku = await prisma.sku.findFirst({ where: { orgId, code: sku } });
    if (!targetSku) {
      return NextResponse.json({ error: "SKU not found" }, { status: 404 });
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        locationId,
        skuId: targetSku.id,
      },
    });

    if (!inventory) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    }

    const updated = await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: Math.max(0, inventory.quantity + adjustment),
        availableQuantity: Math.max(0, inventory.availableQuantity + adjustment),
      },
    });

    return NextResponse.json({ success: true, inventoryId: updated.id, quantity: updated.quantity, available: updated.availableQuantity });
  } catch (error) {
    console.error("[INVENTORY_ADJUST]", error);
    return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500 });
  }
}
