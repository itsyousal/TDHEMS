import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Temporary endpoint to grant hr.manage permission to admin role
// NOTE: This endpoint bypasses auth for one-time setup. Delete after use!
export async function POST(req: NextRequest) {
    try {
        console.log('🔐 Granting hr.manage permission to admin role...');

        // Step 1: Ensure the permission exists
        const permission = await prisma.permission.upsert({
            where: { slug: 'hr.manage' },
            update: {},
            create: {
                name: 'Manage HR',
                slug: 'hr.manage',
                description: 'Manage employees and HR settings',
                category: 'hr',
            },
        });
        console.log('✅ Permission exists:', permission.slug);

        // Step 2: Find the admin role
        const adminRole = await prisma.role.findUnique({
            where: { slug: 'admin' },
        });

        if (!adminRole) {
            // Try owner-super-admin as fallback
            const ownerRole = await prisma.role.findUnique({
                where: { slug: 'owner-super-admin' },
            });

            if (!ownerRole) {
                const roles = await prisma.role.findMany({ select: { slug: true, name: true } });
                return NextResponse.json({
                    error: 'No admin role found',
                    availableRoles: roles
                }, { status: 404 });
            }

            // Grant to owner-super-admin instead
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: ownerRole.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    roleId: ownerRole.id,
                    permissionId: permission.id,
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Permission granted to owner-super-admin role',
                role: ownerRole.name,
                permission: permission.slug,
            });
        }

        // Step 3: Grant permission to admin role
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: permission.id,
            },
        });
        console.log('✅ Permission granted to admin role');

        return NextResponse.json({
            success: true,
            message: 'Permission granted successfully',
            role: adminRole.name,
            permission: permission.slug,
        });
    } catch (error) {
        console.error('Error granting permission:', error);
        return NextResponse.json({
            error: 'Failed to grant permission',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
