import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing permissions...');

    // 1. Ensure hr.manage permission exists
    const hrManagePermission = await prisma.permission.upsert({
        where: { slug: 'hr.manage' },
        update: {},
        create: {
            name: 'HR Manage',
            slug: 'hr.manage',
            category: 'hr',
            description: 'Manage employees and HR settings',
        },
    });
    console.log('Ensured hr.manage permission:', hrManagePermission.id);

    // 2. Get Admin role
    const adminRole = await prisma.role.findUnique({
        where: { slug: 'admin' },
    });

    if (!adminRole) {
        console.error('Admin role not found!');
        return;
    }

    // 3. Assign permission to Admin role
    await prisma.rolePermission.upsert({
        where: {
            roleId_permissionId: {
                roleId: adminRole.id,
                permissionId: hrManagePermission.id,
            },
        },
        update: {},
        create: {
            roleId: adminRole.id,
            permissionId: hrManagePermission.id,
        },
    });

    console.log('Assigned hr.manage to Admin role.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
