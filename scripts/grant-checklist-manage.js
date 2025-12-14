const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get the admin's role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'Owner / Super Admin' }
    });

    if (!adminRole) {
      console.log('Admin role not found');
      return;
    }

    console.log('Found role:', adminRole.name, adminRole.id);

    // Check if checklists.manage permission exists
    let managePermission = await prisma.permission.findFirst({
      where: { slug: 'checklists.manage' }
    });

    if (!managePermission) {
      // Create the permission if it doesn't exist
      managePermission = await prisma.permission.create({
        data: {
          name: 'Manage Checklists',
          slug: 'checklists.manage',
          description: 'Create, edit, and delete checklists and manage role assignments',
          category: 'checklists'
        }
      });
      console.log('Created checklists.manage permission');
    } else {
      console.log('Found checklists.manage permission:', managePermission.id);
    }

    // Check if role already has this permission
    const existingRolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId: adminRole.id,
        permissionId: managePermission.id
      }
    });

    if (existingRolePermission) {
      console.log('Role already has checklists.manage permission');
    } else {
      // Add the permission to the role
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: managePermission.id
        }
      });
      console.log('Added checklists.manage permission to Owner / Super Admin role');
    }

    console.log('\nDone! The admin user now has full checklist management permissions.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
