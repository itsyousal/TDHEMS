import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface CreateEmployeePayload {
    employeeId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
    roleSlug?: string;
    joinDate?: string;
    password?: string;
    salary?: string | number;
}

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
        ur.role.rolePermissions.some((rp: { permission: { slug: string } }) => rp.permission.slug === REQUIRED_PERMISSION)
    );
}

// GET /api/employees - List all employees
export async function GET(req: NextRequest) {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hasPermission = await userHasHrAccess(userId);
        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        // Fetch employees with their user accounts and role details
        const employees = await prisma.employee.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                        lastLogin: true,
                        userRoles: {
                            include: {
                                role: {
                                    select: { 
                                        slug: true,
                                        name: true 
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
}

// POST /api/employees - Create new employee with user account
export async function POST(req: NextRequest) {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hasPermission = await userHasHrAccess(userId);
        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const body = (await req.json()) as CreateEmployeePayload;
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phone,
            department,
            designation,
            roleSlug,
            joinDate,
            password,
            salary,
        } = body;

        const requestedRoleSlug = roleSlug?.trim() || 'employee';

        // Validate required fields
        if (!employeeId || !firstName || !lastName || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields: employeeId, firstName, lastName, email, password' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        // Get user's organization
        const userOrg = await prisma.userOrgMap.findFirst({
            where: { userId }
        });

        if (!userOrg) {
            return NextResponse.json({ error: 'User organization not found' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const salaryValue = typeof salary === 'number'
            ? salary
            : salary
                ? parseFloat(String(salary))
                : null;

        // Create user and employee in a transaction
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Create user account
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    isActive: true,
                    activationDate: new Date(),
                }
            });

            // Create employee record
            const employee = await tx.employee.create({
                data: {
                    userId: user.id,
                    orgId: userOrg.orgId,
                    employeeId,
                    firstName,
                    lastName,
                    email,
                    phone,
                    department,
                    designation,
                    joinDate: joinDate ? new Date(joinDate) : new Date(),
                    salary: salaryValue,
                    status: 'active',
                }
            });

            const desiredRoleSlug = requestedRoleSlug;
            let assignedRole = await tx.role.findFirst({
                where: { slug: desiredRoleSlug }
            });

            if (!assignedRole && desiredRoleSlug !== 'employee') {
                assignedRole = await tx.role.findFirst({
                    where: { slug: 'employee' }
                });
            }

            if (assignedRole) {
                await tx.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: assignedRole.id,
                        orgId: userOrg.orgId,
                    }
                });
            }

            await tx.userOrgMap.create({
                data: {
                    userId: user.id,
                    orgId: userOrg.orgId,
                }
            });

            const assignedRoleSlugForLog = assignedRole?.slug || requestedRoleSlug;

            await tx.auditLog.create({
                data: {
                    userId,
                    action: 'employee.create',
                    resource: 'Employee',
                    resourceId: employee.id,
                    changes: {
                        employeeId,
                        email,
                        name: `${firstName} ${lastName}`,
                        role: assignedRoleSlugForLog,
                    },
                    status: 'success'
                }
            });

            return { user, employee };
        });

        return NextResponse.json({
            success: true,
            employee: {
                id: result.employee.id,
                employeeId: result.employee.employeeId,
                name: `${result.employee.firstName} ${result.employee.lastName}`,
                email: result.employee.email,
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating employee:', error);
        return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }
}

