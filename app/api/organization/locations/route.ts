
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { userOrgMap: true },
        });

        if (!user || user.userOrgMap.length === 0) {
            return new NextResponse("User not associated with an organization", { status: 400 });
        }
        const orgId = user.userOrgMap[0].orgId;

        const locations = await prisma.location.findMany({
            where: { orgId, isActive: true },
            select: { id: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(locations);
    } catch (error) {
        console.error("[ORG_LOCATIONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
