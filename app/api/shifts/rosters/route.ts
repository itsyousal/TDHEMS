
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

        const rosters = await prisma.shiftsRoster.findMany({
            where: { orgId },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(rosters);
    } catch (error) {
        console.error("[SHIFTS_ROSTERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { userOrgMap: true },
        });

        if (!user?.userOrgMap?.[0]?.orgId) {
            return new NextResponse("Organization not found", { status: 400 });
        }
        const orgId = user.userOrgMap[0].orgId;

        const body = await req.json();
        const { name, startTime, endTime, breakDuration } = body;

        if (!name || !startTime || !endTime) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const roster = await prisma.shiftsRoster.create({
            data: {
                orgId,
                name,
                startTime,
                endTime,
                breakDuration: parseInt(breakDuration) || 0,
            },
        });

        return NextResponse.json(roster);
    } catch (error) {
        console.error("[SHIFTS_ROSTERS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
