import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const [totalSkus, inStockItems, lowStockItems, recentMovements] = await Promise.all([
            // Total SKUs
            prisma.sku.count({
                where: { isActive: true },
            }),
            // In Stock (SKUs with quantity > 0)
            prisma.inventory.count({
                where: { quantity: { gt: 0 } },
            }),
            // Low Stock (SKUs with quantity <= reorderLevel)
            prisma.inventory.count({
                where: {
                    quantity: { lte: 20 }, // Using hardcoded 20 for now as reorderLevel might be null
                },
            }),
            // Recent Movements (StockLedger entries in last 24h)
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
            inStockItems,
            lowStockItems,
            recentMovements,
        });
    } catch (error) {
        console.error("[INVENTORY_STATS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
