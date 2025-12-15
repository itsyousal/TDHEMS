import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // 1. Verify Admin Permissions (Only admins can change roles)
        const userId = (session.user as any).id;
        const currentUserRoles = await prisma.userRole.findMany({
            where: { userId },
            include: { role: true }
        });

        const isAdmin = currentUserRoles.some((ur: { role: { slug: string } }) => ur.role.slug === 'admin' || ur.role.slug === 'owner-super-admin');

        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { role } = body;

        if (!role || !['admin', 'manager', 'employee'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
        }

        // 2. Find the target employee and their user account
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!employee || !employee.user) {
            return NextResponse.json({ error: 'Employee or associated user account not found' }, { status: 404 });
        }

        // 3. Find the role ID for the requested slug
        // Note: We assume standard roles 'admin', 'manager', 'employee' exist. 
        // If 'manager' doesn't exist in your seed, we might need to fallback or error.
        // For now, let's map 'manager' to 'employee' if it doesn't exist, or handle it strictly.
        // Let's try to find the exact role first.
        let targetRole = await prisma.role.findFirst({
            where: { slug: role }
        });

        // Fallback for 'manager' if not seeded, maybe map to 'employee' with extra permissions? 
        // Or just fail. Let's fail to be safe, but maybe 'manager' isn't in the seed.
        // If 'manager' is requested but not found, let's error.
        if (!targetRole) {
            return NextResponse.json({ error: `Role '${role}' not found in system` }, { status: 400 });
        }

        // 4. Update the UserRole
        // We remove existing roles for this org and add the new one.
        // Assuming single role per org for simplicity in this UI.

        // Get user's org (from employee record)
        const orgId = employee.orgId;

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Remove existing roles for this user in this org
            await tx.userRole.deleteMany({
                where: {
                    userId: employee.user!.id,
                    orgId: orgId
                }
            });

            // Assign new role
            await tx.userRole.create({
                data: {
                    userId: employee.user!.id,
                    roleId: targetRole.id,
                    orgId: orgId
                }
            });

            // Log the action
            await tx.auditLog.create({
                data: {
                    userId: (session.user as any).id,
                    action: 'employee.access_update',
                    resource: 'Employee',
                    resourceId: employee.id,
                    changes: {
                        previousRole: 'unknown', // Could fetch before delete if needed
                        newRole: role,
                        employeeName: `${employee.firstName} ${employee.lastName}`
                    },
                    status: 'success'
                }
            });
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating access:', error);
        return NextResponse.json({ error: 'Failed to update access' }, { status: 500 });
    }
}
