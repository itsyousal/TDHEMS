
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: Request) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const employeeId = searchParams.get("employeeId");

        if (!startDate || !endDate) {
            return new NextResponse("Date range required", { status: 400 });
        }

        const whereClause: any = {
            assignedDate: {
                gte: startOfDay(parseISO(startDate)),
                lte: endOfDay(parseISO(endDate)),
            },
        };

        if (employeeId) {
            whereClause.employeeId = employeeId;
        }

        const assignments = await prisma.shiftAssignment.findMany({
            where: whereClause,
            include: {
                shift: true,
                employee: true,
                location: true,
            },
            orderBy: {
                assignedDate: 'asc',
            },
        });

        return NextResponse.json(assignments);
    } catch (error) {
        console.error("[SHIFTS_ASSIGNMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getAuthSession();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { employeeId, shiftId, locationId, assignedDate } = body;

        if (!employeeId || !shiftId || !locationId || !assignedDate) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Check if assignment already exists for this day/employee
        const existingAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                employeeId,
                assignedDate: {
                    gte: startOfDay(parseISO(assignedDate)),
                    lte: endOfDay(parseISO(assignedDate)),
                }
            }
        });

        let assignment;
        if (existingAssignment) {
            // Update
            assignment = await prisma.shiftAssignment.update({
                where: { id: existingAssignment.id },
                data: {
                    shiftId,
                    locationId,
                }
            });
        } else {
            // Create
            assignment = await prisma.shiftAssignment.create({
                data: {
                    employeeId,
                    shiftId,
                    locationId,
                    assignedDate: parseISO(assignedDate),
                },
            });
        }

        return NextResponse.json(assignment);
    } catch (error) {
        console.error("[SHIFTS_ASSIGNMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
