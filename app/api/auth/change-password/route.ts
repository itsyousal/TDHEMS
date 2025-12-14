import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface ChangePasswordPayload {
    currentPassword?: string;
    newPassword?: string;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getAuthSession();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await req.json()) as ChangePasswordPayload;
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'New password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Get user from DB to verify current password
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        // Log the action (non-critical, don't fail if this errors)
        try {
            await prisma.auditLog.create({
                data: {
                    userId: userId,
                    action: 'change_password',
                    resource: 'users',
                    resourceId: userId,
                    status: 'success',
                    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: req.headers.get('user-agent') || 'unknown'
                }
            });
        } catch (auditError) {
            console.error('Failed to create audit log:', auditError);
            // Continue anyway - password was updated successfully
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({
            error: 'Failed to change password',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
