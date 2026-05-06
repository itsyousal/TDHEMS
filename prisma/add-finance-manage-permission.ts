
/**
 * Add finance.manage and other finance permissions to admin roles
 * Run with: npx ts-node prisma/add-finance-manage-permission.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addFinancePermissions() {
  try {
    console.log('Adding finance permissions...');

    const permissionsToGrant = [
      { slug: 'finance.view', name: 'View Finance', description: 'Ability to view financial dashboard and reports', category: 'finance' },
      { slug: 'finance.edit', name: 'Edit Finance', description: 'Ability to edit financial records', category: 'finance' },
      { slug: 'finance.reconcile', name: 'Reconcile Finance', description: 'Ability to perform daily reconciliation', category: 'finance' },
      { slug: 'finance.manage', name: 'Manage Finance', description: 'Ability to manage all financial settings and manual transactions', category: 'finance' },
    ];

    const roleSlugs = ['owner-super-admin', 'general-manager'];

    for (const perm of permissionsToGrant) {
      // Create permission
      const permission = await prisma.permission.upsert({
        where: { slug: perm.slug },
        update: {},
        create: {
          name: perm.name,
          slug: perm.slug,
          description: perm.description,
          category: perm.category,
        },
      });

      console.log(`✓ Ensured permission: ${permission.slug}`);

      // Assign to roles
      for (const roleSlug of roleSlugs) {
        const role = await prisma.role.findUnique({
          where: { slug: roleSlug },
        });

        if (role) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
          console.log(`  ✓ Assigned ${permission.slug} to ${roleSlug}`);
        } else {
          console.log(`  ⚠ Role ${roleSlug} not found`);
        }
      }
    }

    console.log('\n✓ Finance permission setup complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addFinancePermissions();
