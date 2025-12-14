/**
 * Seed script to add password reset permissions
 * Run with: npx ts-node prisma/seed-password-reset.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPasswordResetPermissions() {
  try {
    console.log('Creating password reset permissions...');

    // Create user.reset_password permission
    const resetPasswordPermission = await prisma.permission.upsert({
      where: { slug: 'user.reset_password' },
      update: {},
      create: {
        name: 'Reset User Passwords',
        slug: 'user.reset_password',
        description: 'Ability to reset other user passwords',
        category: 'user_management',
      },
    });

    console.log('✓ Created permission:', resetPasswordPermission.slug);

    // Define roles that should have password reset permission
    const rolesToUpdate = [
      'owner-super-admin', // Owner/Super Admin
      'general-manager',   // General Manager
      'hr-people-ops',     // HR/People Ops
    ];

    for (const roleSlug of rolesToUpdate) {
      const role = await prisma.role.findUnique({
        where: { slug: roleSlug },
      });

      if (!role) {
        console.warn(`⚠ Role "${roleSlug}" not found. Skipping...`);
        continue;
      }

      // Assign permission to role
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: resetPasswordPermission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: resetPasswordPermission.id,
        },
      });

      console.log(`✓ Assigned permission to ${role.name} role`);
    }

    console.log('\n✓ Password reset permissions setup complete!');
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPasswordResetPermissions();
