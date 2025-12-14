import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                employeeRecord: true,
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        // 1. Fetch Today's Shift
        const todayShift = await prisma.shiftAssignment.findFirst({
            where: {
                employeeId: user.employeeRecord?.id,
                assignedDate: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            },
            include: {
                shift: true,
                location: true,
            },
        });

        // 2. Fetch Today's Attendance
        const todayAttendance = await prisma.attendanceEvent.findMany({
            where: {
                userId: user.id,
                eventTime: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            },
            orderBy: {
                eventTime: "desc",
            },
        });

        // 3. Fetch Assigned/In-Progress Checklists
        const activeChecklists = await prisma.checklistRun.findMany({
            where: {
                userId: user.id,
                status: "in_progress",
            },
            include: {
                checklist: true,
            },
            take: 5,
        });

        // 4. Calculate current status
        const lastEvent = todayAttendance[0];
        const currentStatus = lastEvent?.eventType === "clock_in" ? "clocked_in" : "clocked_out";

        return NextResponse.json({
            employee: user.employeeRecord,
            shift: todayShift,
            attendance: todayAttendance,
            checklists: activeChecklists,
            currentStatus,
        });
    } catch (error) {
        console.error("[EMPLOYEE_DASHBOARD_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
