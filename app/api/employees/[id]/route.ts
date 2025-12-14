import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

interface UpdateEmployeePayload {
    firstName?: string;
    lastName?: string;
    phone?: string;
    department?: string;
    designation?: string;
    status?: string;
    salary?: string | number;
}

const REQUIRED_PERMISSION = 'hr.manage';

// Helper to check permissions
async function checkPermission(userId: string) {
    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
            role: {
                include: {
                    rolePermissions: { include: { permission: true } },
                },
            },
        },
    });
    return userRoles.some(
        (ur) => ur.role.slug === 'admin' || ur.role.rolePermissions.some((rp) => rp.permission.slug === REQUIRED_PERMISSION)
    );
}

// GET /api/employees/[id] - Get single employee
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const hasPermission = await checkPermission(userId);
        if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: { user: { select: { email: true, isActive: true, lastLogin: true } } },
        });
        if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        return NextResponse.json(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
    }
}

// PATCH /api/employees/[id] - Update employee details
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const hasPermission = await checkPermission(userId);
        if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const body = (await req.json()) as UpdateEmployeePayload;
        const { firstName, lastName, phone, department, designation, status, salary } = body;
        const salaryValue = typeof salary === 'number' ? salary : salary ? parseFloat(String(salary)) : undefined;

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                firstName,
                lastName,
                phone,
                department,
                designation,
                status,
                salary: salaryValue,
            },
        });

        const loggedChanges: Prisma.JsonObject = {};
        if (firstName !== undefined) loggedChanges.firstName = firstName;
        if (lastName !== undefined) loggedChanges.lastName = lastName;
        if (phone !== undefined) loggedChanges.phone = phone;
        if (department !== undefined) loggedChanges.department = department;
        if (designation !== undefined) loggedChanges.designation = designation;
        if (status !== undefined) loggedChanges.status = status;
        if (salaryValue !== undefined) loggedChanges.salary = salaryValue;

        // Log action
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'employee.update',
                resource: 'Employee',
                resourceId: id,
                changes: loggedChanges,
                status: 'success'
            },
        });

        return NextResponse.json(employee);
    } catch (error) {
        console.error('Error updating employee:', error);
        return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }
}

// DELETE /api/employees/[id] - Deactivate employee
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const hasPermission = await checkPermission(userId);
        if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const employee = await prisma.employee.findUnique({ where: { id }, select: { userId: true } });
        if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

        await prisma.$transaction([
            prisma.employee.update({ where: { id }, data: { status: 'terminated', exitDate: new Date() } }),
            ...(employee.userId ? [
                prisma.user.update({ where: { id: employee.userId }, data: { isActive: false } })
            ] : []),
            prisma.auditLog.create({
                data: {
                    userId,
                    action: 'employee.terminate',
                    resource: 'Employee',
                    resourceId: id,
                    status: 'success'
                },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting employee:', error);
        return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }
}
