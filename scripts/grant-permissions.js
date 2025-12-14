const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Granting hr.manage permission to admin role...');

    try {
        // Step 1: Ensure the permission exists
        await prisma.$executeRaw`
      INSERT INTO "Permission" (id, slug, description, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'hr.manage', 'Manage employees and HR settings', NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `;
        console.log('✓ Ensured hr.manage permission exists');

        // Step 2: Grant permission to admin role
        await prisma.$executeRaw`
      INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt", "updatedAt")
      SELECT 
        r.id as "roleId",
        p.id as "permissionId",
        NOW() as "createdAt",
        NOW() as "updatedAt"
      FROM "Role" r
      CROSS JOIN "Permission" p
      WHERE r.slug = 'admin' AND p.slug = 'hr.manage'
      ON CONFLICT ("roleId", "permissionId") DO NOTHING
    `;
        console.log('✓ Granted hr.manage permission to admin role');

        // Step 3: Verify the permission was granted
        const result = await prisma.$queryRaw`
      SELECT 
        r.name as role_name,
        p.slug as permission_slug,
        p.description as permission_description
      FROM "RolePermission" rp
      JOIN "Role" r ON rp."roleId" = r.id
      JOIN "Permission" p ON rp."permissionId" = p.id
      WHERE r.slug = 'admin' AND p.slug = 'hr.manage'
    `;

        if (result.length > 0) {
            console.log('\n✅ SUCCESS! Permission granted:');
            console.log(result[0]);
        } else {
            console.log('\n⚠️  Warning: Could not verify permission grant');
        }
    } catch (error) {
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
