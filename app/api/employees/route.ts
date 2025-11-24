import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/employees - List all employees
export async function GET(req: NextRequest) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has hr.manage or admin permission
        const userRoles = await prisma.userRole.findMany({
            where: { userId: session.user.id },
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

        const hasPermission = userRoles.some(ur =>
            ur.role.slug === 'admin' ||
            ur.role.rolePermissions.some(rp => rp.permission.slug === 'hr.manage')
        );

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        // Fetch employees with their user accounts
        const employees = await prisma.employee.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                        lastLogin: true,
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
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has hr.manage or admin permission
        const userRoles = await prisma.userRole.findMany({
            where: { userId: session.user.id },
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

        const hasPermission = userRoles.some(ur =>
            ur.role.slug === 'admin' ||
            ur.role.rolePermissions.some(rp => rp.permission.slug === 'hr.manage')
        );

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phone,
            department,
            designation,
            joinDate,
            password,
            salary,
        } = body;

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
            where: { userId: session.user.id }
        });

        if (!userOrg) {
            return NextResponse.json({ error: 'User organization not found' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and employee in a transaction
        const result = await prisma.$transaction(async (tx) => {
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
                    salary: salary ? parseFloat(salary) : null,
                    status: 'active',
                }
            });

            // Assign default "Employee" role
            const employeeRole = await tx.role.findFirst({
                where: { slug: 'employee' }
            });

            if (employeeRole) {
                await tx.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: employeeRole.id,
                        orgId: userOrg.orgId,
                    }
                });

                // Map user to organization
                await tx.userOrgMap.create({
                    data: {
                        userId: user.id,
                        orgId: userOrg.orgId,
                    }
                });
            }

            // Log the action
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: 'employee.create',
                    entityType: 'Employee',
                    entityId: employee.id,
                    metadata: {
                        employeeId,
                        email,
                        name: `${firstName} ${lastName}`,
                    },
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
