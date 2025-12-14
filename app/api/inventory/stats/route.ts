import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { InventoryType } from "@prisma/client";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const [
            totalSkus,
            rawSkus,
            finishedSkus,
            inStockItems,
            rawInStockItems,
            finishedInStockItems,
            lowStockItems,
            rawLowStockItems,
            finishedLowStockItems,
            recentMovements,
        ] = await Promise.all([
            prisma.sku.count({ where: { isActive: true } }),
            prisma.sku.count({ where: { isActive: true, inventoryType: InventoryType.RAW } }),
            prisma.sku.count({ where: { isActive: true, inventoryType: InventoryType.FINISHED } }),
            prisma.inventory.count({ where: { quantity: { gt: 0 } } }),
            prisma.inventory.count({ where: { quantity: { gt: 0 }, sku: { inventoryType: InventoryType.RAW } } }),
            prisma.inventory.count({ where: { quantity: { gt: 0 }, sku: { inventoryType: InventoryType.FINISHED } } }),
            prisma.inventory.count({ where: { quantity: { lte: 20 } } }),
            prisma.inventory.count({ where: { quantity: { lte: 20 }, sku: { inventoryType: InventoryType.RAW } } }),
            prisma.inventory.count({ where: { quantity: { lte: 20 }, sku: { inventoryType: InventoryType.FINISHED } } }),
            prisma.stockLedger.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);

        return NextResponse.json({
            totalSkus,
            rawSkus,
            finishedSkus,
            inStockItems,
            rawInStockItems,
            finishedInStockItems,
            lowStockItems,
            rawLowStockItems,
            finishedLowStockItems,
            recentMovements,
        });
    } catch (error) {
        console.error("[INVENTORY_STATS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
