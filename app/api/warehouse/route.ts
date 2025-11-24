import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
    const session = await getAuthSession();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                location: true,
                bins: true,
            },
        });
        return NextResponse.json(warehouses);
    } catch (error) {
        console.error("[WAREHOUSE_LIST_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
