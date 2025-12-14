import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { action, location } = body; // action: 'clock_in' | 'clock_out'

        if (!['clock_in', 'clock_out'].includes(action)) {
            return new NextResponse("Invalid action", { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                employeeRecord: true,
                userRoles: { include: { role: true } },
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Disallow clock actions for Owner/Super Admin
        const isOwnerSuperAdmin = user.userRoles?.some((ur: { role: { slug: string, name: string } }) => ur.role.slug === "owner-super-admin" || /owner/i.test(ur.role.name) || /super\s*admin/i.test(ur.role.name));
        if (isOwnerSuperAdmin) {
            return new NextResponse("Forbidden for owner/super admin", { status: 403 });
        }

        // Create attendance event
        const event = await prisma.attendanceEvent.create({
            data: {
                userId: user.id,
                employeeId: user.employeeRecord?.id,
                eventType: action,
                eventTime: new Date(),
                location: location || "Main Office", // Default or from request
            },
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error("[ATTENDANCE_CLOCK_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
