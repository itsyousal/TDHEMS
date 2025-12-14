import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { subDays, startOfDay, endOfDay } from 'date-fns';

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

    return userRoles.some((ur: { role: { slug: string, rolePermissions: { permission: { slug: string } }[] } }) =>
        ur.role.slug === 'admin' ||
        ur.role.slug === 'owner-super-admin' ||
        ur.role.rolePermissions.some((rp: { permission: { slug: string } }) => rp.permission.slug === REQUIRED_PERMISSION)
    );
}

/**
 * GET /api/hr/stats
 * Returns HR dashboard statistics
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

        // Get user's organization
        const userOrg = await prisma.userOrgMap.findFirst({
            where: { userId }
        });

        if (!userOrg) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
        }

        // Fetch all employees for the organization
        const employees = await prisma.employee.findMany({
            where: { orgId: userOrg.orgId },
            include: {
                user: {
                    select: {
                        id: true,
                        isActive: true,
                        userRoles: {
                            include: {
                                role: {
                                    select: { name: true, slug: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Calculate date ranges
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        const dayStart = startOfDay(today);
        const dayEnd = endOfDay(today);

        // Get today's attendance
        const todayAttendance = await prisma.attendanceEvent.findMany({
            where: {
                eventTime: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
        });

        // Process attendance to get current status per user
        const userLatestStatus = new Map<string, string>();
        const sortedEvents = [...todayAttendance].sort(
            (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
        );
        for (const event of sortedEvents) {
            if (!userLatestStatus.has(event.userId)) {
                userLatestStatus.set(event.userId, event.eventType);
            }
        }

        // Calculate statistics
        const stats = {
            totalEmployees: employees.length,
            activeEmployees: 0,
            inactiveEmployees: 0,
            onLeaveEmployees: 0,
            terminatedEmployees: 0,
            newHires30Days: 0,
            departmentCounts: {} as Record<string, number>,
            roleDistribution: {} as Record<string, number>,
            attendanceToday: {
                clockedIn: 0,
                clockedOut: 0,
                notClocked: 0,
            },
        };

        employees.forEach((emp) => {
            // Status counts
            switch (emp.status) {
                case 'active':
                    stats.activeEmployees++;
                    break;
                case 'inactive':
                    stats.inactiveEmployees++;
                    break;
                case 'on_leave':
                    stats.onLeaveEmployees++;
                    break;
                case 'terminated':
                    stats.terminatedEmployees++;
                    break;
            }

            // New hires count
            if (emp.joinDate && new Date(emp.joinDate) >= thirtyDaysAgo) {
                stats.newHires30Days++;
            }

            // Department distribution
            const dept = emp.department || 'Unassigned';
            stats.departmentCounts[dept] = (stats.departmentCounts[dept] || 0) + 1;

            // Role distribution
            const role = emp.user?.userRoles?.[0]?.role?.name || 'No Role';
            stats.roleDistribution[role] = (stats.roleDistribution[role] || 0) + 1;

            // Attendance tracking for active employees
            if (emp.status === 'active' && emp.user?.id) {
                const latestStatus = userLatestStatus.get(emp.user.id);
                if (latestStatus === 'clock_in') {
                    stats.attendanceToday.clockedIn++;
                } else if (latestStatus === 'clock_out') {
                    stats.attendanceToday.clockedOut++;
                } else {
                    stats.attendanceToday.notClocked++;
                }
            }
        });

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching HR stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch HR statistics' },
            { status: 500 }
        );
    }
}
