import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

const REQUIRED_PERMISSION = 'hr.manage';

async function userHasHrAccess(userId: string) {
    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
            role: {
                include: {
                    rolePermissions: {
                        include: { permission: true }
                    }
                }
            }
        }
    });

    return userRoles.some(ur =>
        ur.role.slug === 'admin' ||
        ur.role.slug === 'owner-super-admin' ||
        ur.role.rolePermissions.some(rp => rp.permission.slug === REQUIRED_PERMISSION)
    );
}

/**
 * GET /api/hr/attendance-today
 * Returns all attendance events for today
 */
export async function GET() {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hasPermission = await userHasHrAccess(userId);
        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden - HR access required' }, { status: 403 });
        }

        const today = new Date();
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        const attendanceEvents = await prisma.attendanceEvent.findMany({
            where: {
                eventTime: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeId: true,
                    },
                },
            },
            orderBy: {
                eventTime: 'desc',
            },
        });

        return NextResponse.json(attendanceEvents);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return NextResponse.json(
            { error: 'Failed to fetch attendance data' },
            { status: 500 }
        );
    }
}
