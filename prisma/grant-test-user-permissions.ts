/**
 * Grant test user full permissions for testing
 * Run with: npx ts-node prisma/grant-test-user-permissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantTestUserPermissions() {
  try {
    console.log('Granting test user permissions...');

    // Find test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@doughhouse.com' },
      include: { userRoles: true },
    });

    if (!testUser) {
      console.error('✗ Test user not found');
      return;
    }

    console.log('✓ Found test user:', testUser.email);

    if (testUser.userRoles.length === 0) {
      console.warn('⚠ Test user has no roles assigned');
      return;
    }

    const userRole = testUser.userRoles[0];
    const role = await prisma.role.findUnique({
      where: { id: userRole.roleId },
      include: { rolePermissions: true },
    });

    console.log('✓ User role:', role?.name);

    // Get or create permissions
    const permissionsToGrant = [
      'crm.view',
      'crm.edit',
      'marketing.view',
      'marketing.edit',
      'finance.view',
      'finance.edit',
      'finance.reconcile',
      'finance.manage',
    ];

    for (const permSlug of permissionsToGrant) {
      const permission = await prisma.permission.upsert({
        where: { slug: permSlug },
        update: {},
        create: {
          name: permSlug.replace('.', ' '),
          slug: permSlug,
          category: permSlug.split('.')[0],
        },
      });

      // Assign to role if not already assigned
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: role!.id,
            permissionId: permission.id,
          },
        },
      });

      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: role!.id,
            permissionId: permission.id,
          },
        });
        console.log(`✓ Granted ${permSlug}`);
      } else {
        console.log(`◆ Already had ${permSlug}`);
      }
    }

    console.log('\n✓ Test user permissions updated!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

grantTestUserPermissions();
