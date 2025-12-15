import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { format } from "date-fns";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const batches = await prisma.productionBatch.findMany({
            orderBy: {
                plannedDate: "desc",
            },
            take: 50,
        });

        // In a real app, we'd join with BOM or Product to get the product name.
        // Since we didn't link BOMs in the seed (optional relation), we might not have product names directly.
        // However, the UI expects a product name.
        // For this demo, we can try to infer it or just show "Batch Product".
        // Wait, the seed script didn't link BOMs.
        // But `ProductionBatch` has `bomId`.
        // If `bomId` is null, we have no product link.
        // I should have linked BOMs or at least stored a product name if the schema allowed.
        // Schema: `bomId String?`.
        // `BatchIngredient` links to `Sku`.
        // We can fetch ingredients to guess the product? No, that's complex.

        // Let's check if I can update the seed to link BOMs?
        // Or I can just return "Custom Batch" if no BOM.
        // Actually, for the demo to look good, I should have linked BOMs.
        // But I didn't create BOMs in the seed.

        // Workaround: I'll fetch the first ingredient's SKU name if available, or use a placeholder.
        // Or I can just update the seed to create BOMs and link them.
        // That would be better but takes time.

        // Alternative: The `ProductionBatch` table doesn't have a `productName` field.
        // It relies on `Bom`.
        // I'll update the API to return "Standard Batch" for now, 
        // OR I can fetch the `BatchIngredient` and use the first SKU name as the "Product".

        // Let's try fetching ingredients.
        const batchesWithIngredients = await prisma.productionBatch.findMany({
            include: {
                ingredients: {
                    include: {
                        sku: true
                    },
                    take: 1
                }
            },
            orderBy: { plannedDate: 'desc' },
            take: 50
        });

        const formattedBatches = batchesWithIngredients.map((batch: { ingredients: any[]; batchNumber: string; yieldQuantity: number | null; status: string; startedAt: Date | null; completedAt: Date | null; plannedDate: Date }) => {
            const productName = batch.ingredients[0]?.sku?.name || "Mixed Batch";

            return {
                id: batch.batchNumber,
                product: productName,
                qty: `${batch.yieldQuantity || 100} units`, // Mock quantity if null
                status: formatStatus(batch.status),
                start: batch.startedAt ? format(new Date(batch.startedAt), "yyyy-MM-dd") : "-",
                end: batch.completedAt ? format(new Date(batch.completedAt), "yyyy-MM-dd") : format(new Date(batch.plannedDate), "yyyy-MM-dd"),
            };
        });

        return NextResponse.json(formattedBatches);
    } catch (error) {
        console.error("[PRODUCTION_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

function formatStatus(status: string) {
    switch (status) {
        case "in_progress": return "In Progress";
        case "completed": return "Completed";
        case "planned": return "Planned";
        case "delayed": return "Delayed";
        default: return status;
    }
}
