import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { InventoryType } from "@prisma/client";

export async function GET(req: Request) {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const typeParam = url.searchParams.get("type");
        const scopeParam = url.searchParams.get("scope")?.toLowerCase();
        let inventoryType: InventoryType | undefined;
        const cookieFilter = {
            category: {
                contains: "cookie",
                mode: "insensitive" as const,
            },
        };
        const shouldFilterFinishedToCookies = scopeParam !== "all";

        if (typeParam === "raw") {
            inventoryType = InventoryType.RAW;
        } else if (typeParam === "finished") {
            inventoryType = InventoryType.FINISHED;
        }

        const inventory = await prisma.inventory.findMany({
            include: {
                sku: true,
                location: true,
            },
            where: inventoryType
                ? {
                      sku: {
                          inventoryType,
                          ...(inventoryType === InventoryType.FINISHED && shouldFilterFinishedToCookies
                              ? cookieFilter
                              : {}),
                      },
                  }
                : {
                      OR: [
                          { sku: { inventoryType: InventoryType.RAW } },
                          {
                              sku: {
                                  inventoryType: InventoryType.FINISHED,
                                  ...(shouldFilterFinishedToCookies ? cookieFilter : {}),
                              },
                          },
                      ],
                  },
            orderBy: {
                sku: {
                    name: "asc",
                },
            },
        });

        const formattedInventory = inventory.map((item: { id: string; skuId: string; locationId: string; availableQuantity: number; reservedQuantity: number; reorderLevel: number | null; sku: { code: string; name: string; inventoryType: string }; location: { name: string } }) => ({
            id: item.id,
            sku: item.sku.code,
            skuId: item.skuId,
            desc: item.sku.name,
            loc: item.location.name,
            locationId: item.locationId,
            avail: item.availableQuantity,
            res: item.reservedQuantity,
            status: item.availableQuantity <= 0 ? "Out of Stock" : item.availableQuantity <= (item.reorderLevel ?? 20) ? "Low Stock" : "In Stock",
            type: item.sku.inventoryType,
        }));

        return NextResponse.json(formattedInventory);
    } catch (error) {
        console.error("[INVENTORY_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
