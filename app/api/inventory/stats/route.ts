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
            prisma.sku.count({
                where: {
                    isActive: true,
                    // Count both RAW and FINISHED without restricted filtering
                },
            }),
            prisma.sku.count({ where: { isActive: true, inventoryType: InventoryType.RAW } }),
            prisma.sku.count({
                where: { isActive: true, inventoryType: InventoryType.FINISHED },
            }),
            prisma.inventory.count({
                where: {
                    quantity: { gt: 0 },
                    // Implicitly includes all types associated with active SKUs if we assume inventory exists for them
                    // But to be consistent with previous logic which filtered by type:
                    sku: { isActive: true }
                },
            }),
            prisma.inventory.count({ where: { quantity: { gt: 0 }, sku: { inventoryType: InventoryType.RAW, isActive: true } } }),
            prisma.inventory.count({
                where: { quantity: { gt: 0 }, sku: { inventoryType: InventoryType.FINISHED, isActive: true } },
            }),
            prisma.inventory.count({
                where: {
                    quantity: { lte: 20 },
                    sku: { isActive: true }
                },
            }),
            prisma.inventory.count({ where: { quantity: { lte: 20 }, sku: { inventoryType: InventoryType.RAW, isActive: true } } }),
            prisma.inventory.count({
                where: { quantity: { lte: 20 }, sku: { inventoryType: InventoryType.FINISHED, isActive: true } },
            }),
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
