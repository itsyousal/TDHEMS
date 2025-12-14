const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Get admin user with roles and permissions
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@doughhouse.com' },
      select: {
        id: true,
        email: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    console.log('Admin user:', admin?.email);
    console.log('User ID:', admin?.id);
    console.log('Roles:', admin?.userRoles?.map(ur => ur.role.name));
    
    const permissions = [];
    admin?.userRoles?.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        permissions.push(rp.permission.slug);
      });
    });
    console.log('Permissions:', permissions);

    // Check for checklists permissions
    const hasView = permissions.includes('checklists.view');
    const hasManage = permissions.includes('checklists.manage');
    console.log('\nHas checklists.view:', hasView);
    console.log('Has checklists.manage:', hasManage);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
