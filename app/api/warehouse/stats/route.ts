import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const [totalLocations, totalBins, capacityAgg, utilizationAgg] = await Promise.all([
            prisma.warehouse.count(),
            prisma.bin.count(),
            prisma.bin.aggregate({ _sum: { capacity: true } }),
            prisma.bin.aggregate({ _sum: { currentUtilization: true } }),
        ]);
        const totalCapacity = capacityAgg._sum.capacity ?? 0;
        const totalUtilization = utilizationAgg._sum.currentUtilization ?? 0;
        return NextResponse.json({
            totalLocations,
            totalBins,
            totalCapacity,
            totalUtilization,
        });
    } catch (error) {
        console.error("[WAREHOUSE_STATS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
