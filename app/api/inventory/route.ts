import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const inventory = await prisma.inventory.findMany({
            include: {
                sku: true,
                location: true,
            },
            orderBy: {
                sku: {
                    name: "asc",
                },
            },
        });

        const formattedInventory = inventory.map((item) => ({
            id: item.id,
            sku: item.sku.code,
            desc: item.sku.name,
            loc: item.location.slug,
            avail: item.availableQuantity,
            res: item.reservedQuantity,
            status: item.availableQuantity > 20 ? "In Stock" : "Low Stock", // Simple logic
        }));

        return NextResponse.json(formattedInventory);
    } catch (error) {
        console.error("[INVENTORY_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
