import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PATCH /api/employees/[id]/credentials - Change employee password
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has hr.manage or admin permission
        const userId = (session.user as any).id;
        const userRoles = await prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: { rolePermissions: { include: { permission: true } } },
                },
            },
        });
        const hasPermission = userRoles.some(
            (ur: { role: { slug: string, rolePermissions: { permission: { slug: string } }[] } }) =>
                ur.role.slug === 'admin' || ur.role.rolePermissions.some((rp: { permission: { slug: string } }) => rp.permission.slug === 'hr.manage')
        );
        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const { password } = await req.json();
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
        }

        // Find employee and associated user
        const employee = await prisma.employee.findUnique({
            where: { id },
            select: { userId: true, firstName: true, lastName: true, email: true },
        });
        if (!employee || !employee.userId) {
            return NextResponse.json({ error: 'Employee or associated user not found' }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and create audit log in a transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { id: employee.userId },
                data: { password: hashedPassword },
            }),
            prisma.auditLog.create({
                data: {
                    userId: (session.user as any).id,
                    action: 'employee.change_password',
                    resource: 'Employee',
                    resourceId: id,
                    changes: {
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        email: employee.email,
                    },
                    status: 'success'
                },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}
