/**
 * Add admin.manage_users permission to admin roles
 * Run with: npx ts-node prisma/add-admin-manage-users-permission.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAdminManageUsersPermission() {
  try {
    console.log('Adding admin.manage_users permission...');

    // Create permission
    const permission = await prisma.permission.upsert({
      where: { slug: 'admin.manage_users' },
      update: {},
      create: {
        name: 'Manage Users',
        slug: 'admin.manage_users',
        description: 'Ability to manage user roles and permissions',
        category: 'admin',
      },
    });

    console.log('✓ Created permission:', permission.slug);

    // Add to Owner/Super Admin role
    const ownerRole = await prisma.role.findUnique({
      where: { slug: 'owner-super-admin' },
    });

    if (ownerRole) {
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
      console.log('✓ Assigned to Owner/Super Admin role');
    }

    // Add to General Manager role (if they should have it)
    const gmRole = await prisma.role.findUnique({
      where: { slug: 'general-manager' },
    });

    if (gmRole) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: gmRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: gmRole.id,
          permissionId: permission.id,
        },
      });
      console.log('✓ Assigned to General Manager role');
    }

    console.log('\n✓ Admin permission setup complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminManageUsersPermission();
