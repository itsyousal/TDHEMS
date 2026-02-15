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
        const batchesWithDetails = await prisma.productionBatch.findMany({
            include: {
                bom: {
                    include: {
                        sku: true,
                    },
                },
                ingredients: {
                    include: {
                        sku: true,
                    },
                    take: 1,
                },
            },
            orderBy: { plannedDate: 'desc' },
            take: 50,
        });

        const formattedBatches = batchesWithDetails.map((batch) => {
            // Get product name from BOM if available, otherwise use first ingredient
            const productName = 
                batch.bom?.sku?.name || 
                batch.ingredients[0]?.sku?.name || 
                "Production Batch";

            return {
                id: batch.id,
                batchNumber: batch.batchNumber,
                product: productName,
                quantity: batch.yieldQuantity || batch.yieldActual || 0,
                plannedQuantity: batch.plannedQuantity || 0,
                status: formatStatus(batch.status),
                startDate: batch.startedAt ? format(new Date(batch.startedAt), "yyyy-MM-dd") : "-",
                endDate: batch.completedAt ? format(new Date(batch.completedAt), "yyyy-MM-dd") : format(new Date(batch.plannedDate), "yyyy-MM-dd"),
                plannedDate: format(new Date(batch.plannedDate), "yyyy-MM-dd"),
                createdAt: format(new Date(batch.createdAt), "yyyy-MM-dd HH:mm"),
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
