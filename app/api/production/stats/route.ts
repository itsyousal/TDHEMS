import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const [activeBatches, completedToday, delayedBatches, totalBatches] = await Promise.all([
            // Active Batches
            prisma.productionBatch.count({
                where: { status: "in_progress" },
            }),
            // Completed Today
            prisma.productionBatch.count({
                where: {
                    status: "completed",
                    completedAt: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                },
            }),
            // Delayed Batches (explicit status or overdue)
            prisma.productionBatch.count({
                where: {
                    OR: [
                        { status: "delayed" },
                        {
                            status: { in: ["planned", "in_progress"] },
                            plannedDate: { lt: todayStart },
                        },
                    ],
                },
            }),
            // Total relevant batches for rate calculation
            prisma.productionBatch.count({
                where: {
                    status: { in: ["completed", "delayed", "in_progress"] },
                },
            }),
        ]);

        // Calculate Production Rate (Completed / Total Active+Completed+Delayed)
        // Avoid division by zero
        const productionRate = totalBatches > 0
            ? Math.round((completedToday / totalBatches) * 100) // This logic is a bit flawed for "Rate", maybe better: Completed / (Completed + Delayed)
            : 100;

        // Better Production Rate: Completed / (Completed + Delayed + In Progress) * 100 ? 
        // Or just use a random high number for demo if data is sparse.
        // Let's stick to a simple Completed vs Total Planned for the day?
        // For now, let's use: (Completed / (Completed + Delayed)) * 100 if we want "Success Rate"
        // The UI shows "Production Rate 94%", implying efficiency.

        const efficiency = totalBatches > 0
            ? Math.round(((totalBatches - delayedBatches) / totalBatches) * 100)
            : 100;

        return NextResponse.json({
            activeBatches,
            completedToday,
            delayedBatches,
            productionRate: efficiency,
        });
    } catch (error) {
        console.error("[PRODUCTION_STATS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
