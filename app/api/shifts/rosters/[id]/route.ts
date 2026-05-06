
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { name, startTime, endTime, breakDuration } = body;

        const roster = await prisma.shiftsRoster.update({
            where: { id: params.id },
            data: {
                name,
                startTime,
                endTime,
                breakDuration: parseInt(breakDuration) || 0,
            },
        });

        return NextResponse.json(roster);
    } catch (error) {
        console.error("[SHIFTS_ROSTERS_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await prisma.shiftsRoster.delete({
            where: { id: params.id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[SHIFTS_ROSTERS_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
