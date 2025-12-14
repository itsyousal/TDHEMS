import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔐 Granting hr.manage permission to admin role...\n');

    try {
        // Step 1: Ensure the permission exists
        const permission = await prisma.permission.upsert({
            where: { slug: 'hr.manage' },
            update: {},
            create: {
                name: 'HR Manage',
                slug: 'hr.manage',
                category: 'hr',
                description: 'Manage employees and HR settings',
            },
        });
        console.log('✅ Permission exists:', permission.slug);

        // Step 2: Find the admin role
        const adminRole = await prisma.role.findUnique({
            where: { slug: 'admin' },
        });

        if (!adminRole) {
            console.error('❌ Admin role not found!');
            console.log('Available roles:');
            const roles = await prisma.role.findMany({ select: { slug: true, name: true } });
            roles.forEach(r => console.log(`  - ${r.slug} (${r.name})`));
            return;
        }
        console.log('✅ Admin role found:', adminRole.name);

        // Step 3: Grant permission to admin role
        const rolePermission = await prisma.rolePermission.upsert({
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

        // Step 4: Verify
        const verification = await prisma.rolePermission.findUnique({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: permission.id,
                },
            },
            include: {
                role: { select: { name: true, slug: true } },
                permission: { select: { slug: true, description: true } },
            },
        });

        if (verification) {
            console.log('\n🎉 SUCCESS! Permission configuration:');
            console.log(`   Role: ${verification.role.name} (${verification.role.slug})`);
            console.log(`   Permission: ${verification.permission.slug}`);
            console.log(`   Description: ${verification.permission.description}`);
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
