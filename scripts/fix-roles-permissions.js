const { PrismaClient } = require('@prisma/client');

/**
 * This script:
 * 1. Ensures Owner/Super Admin has ALL permissions
 * 2. Updates checklist roles from 'founder'/'owner' to just 'owner'
 * 3. Updates the AVAILABLE_ROLES in the UI to match actual database roles
 */

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== ROLE & PERMISSION CLEANUP ===\n');

    // 1. Get Owner/Super Admin role
    const ownerRole = await prisma.role.findFirst({
      where: { slug: 'owner-super-admin' }
    });

    if (!ownerRole) {
      console.log('ERROR: Owner/Super Admin role not found!');
      return;
    }

    console.log('Found Owner/Super Admin role:', ownerRole.id);

    // 2. Get ALL permissions
    const allPermissions = await prisma.permission.findMany();
    console.log(`Found ${allPermissions.length} total permissions`);

    // 3. Get current role permissions for Owner/Super Admin
    const currentRolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: ownerRole.id },
      select: { permissionId: true }
    });
    const currentPermissionIds = new Set(currentRolePermissions.map(rp => rp.permissionId));
    console.log(`Owner/Super Admin currently has ${currentPermissionIds.size} permissions`);

    // 4. Add missing permissions to Owner/Super Admin
    const missingPermissions = allPermissions.filter(p => !currentPermissionIds.has(p.id));
    
    if (missingPermissions.length > 0) {
      console.log(`\nAdding ${missingPermissions.length} missing permissions:`);
      for (const perm of missingPermissions) {
        await prisma.rolePermission.create({
          data: {
            roleId: ownerRole.id,
            permissionId: perm.id
          }
        });
        console.log(`  + ${perm.slug}`);
      }
    } else {
      console.log('\nOwner/Super Admin already has all permissions!');
    }

    // 5. Update checklist roles - replace 'founder' with 'owner', keep as 'owner-super-admin'
    console.log('\n=== UPDATING CHECKLIST ROLES ===');
    
    const checklists = await prisma.checklist.findMany({
      select: { id: true, name: true, roles: true }
    });

    for (const checklist of checklists) {
      const oldRoles = checklist.roles;
      // Replace founder/owner with owner-super-admin, and other role names with proper slugs
      const newRoles = oldRoles.map(role => {
        const lowerRole = role.toLowerCase();
        if (lowerRole === 'founder' || lowerRole === 'owner' || lowerRole === 'admin') {
          return 'owner-super-admin';
        }
        if (lowerRole === 'manager') return 'general-manager';
        if (lowerRole === 'supervisor') return 'store-manager';
        if (lowerRole === 'cook' || lowerRole === 'kitchen') return 'kitchen-assistant-cooks';
        if (lowerRole === 'cashier') return 'pos-operator';
        if (lowerRole === 'counter-attendant' || lowerRole === 'attendant') return 'pos-operator';
        return role; // Keep as-is if no mapping
      }).filter((role, index, arr) => arr.indexOf(role) === index); // Remove duplicates

      if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
        await prisma.checklist.update({
          where: { id: checklist.id },
          data: { roles: newRoles }
        });
        console.log(`Updated "${checklist.name}": [${oldRoles.join(', ')}] → [${newRoles.join(', ')}]`);
      }
    }

    // 6. Also update checklist item roles
    console.log('\n=== UPDATING CHECKLIST ITEM ROLES ===');
    
    const items = await prisma.checklistItem.findMany({
      where: { roles: { isEmpty: false } },
      select: { id: true, title: true, roles: true }
    });

    for (const item of items) {
      const oldRoles = item.roles;
      const newRoles = oldRoles.map(role => {
        const lowerRole = role.toLowerCase();
        if (lowerRole === 'founder' || lowerRole === 'owner' || lowerRole === 'admin') {
          return 'owner-super-admin';
        }
        if (lowerRole === 'manager') return 'general-manager';
        if (lowerRole === 'supervisor') return 'store-manager';
        if (lowerRole === 'cook' || lowerRole === 'kitchen') return 'kitchen-assistant-cooks';
        if (lowerRole === 'cashier') return 'pos-operator';
        if (lowerRole === 'counter-attendant' || lowerRole === 'attendant') return 'pos-operator';
        return role;
      }).filter((role, index, arr) => arr.indexOf(role) === index);

      if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
        await prisma.checklistItem.update({
          where: { id: item.id },
          data: { roles: newRoles }
        });
        console.log(`Updated item "${item.title}": [${oldRoles.join(', ')}] → [${newRoles.join(', ')}]`);
      }
    }

    // 7. Final verification
    console.log('\n=== VERIFICATION ===');
    const finalPerms = await prisma.rolePermission.count({
      where: { roleId: ownerRole.id }
    });
    console.log(`Owner/Super Admin now has ${finalPerms} permissions (total available: ${allPermissions.length})`);

    // List all roles for reference
    console.log('\n=== AVAILABLE ROLES ===');
    const allRoles = await prisma.role.findMany({
      select: { name: true, slug: true },
      orderBy: { name: 'asc' }
    });
    allRoles.forEach(r => console.log(`  - ${r.name} (${r.slug})`));

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
