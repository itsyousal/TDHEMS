import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin2@test.com";
    const password = "admin123";
    const orgName = "The Dough House";
    const orgSlug = "dough-house-hq";

    console.log("🚀 Creating admin user...");

    // 1. Create Organization
    const org = await prisma.organization.upsert({
        where: { slug: orgSlug },
        update: {},
        create: {
            name: orgName,
            slug: orgSlug,
            email: "contact@doughhouse.com",
        },
    });
    console.log(`✅ Organization created/found: ${org.name}`);

    // 2. Find Role
    const role = await prisma.role.findUnique({
        where: { slug: "owner-super-admin" },
    });

    if (!role) {
        throw new Error("Role 'owner-super-admin' not found. Did you run the seed?");
    }
    console.log(`✅ Role found: ${role.name}`);

    // 3. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            isActive: true,
            firstName: "Admin",
            lastName: "User",
        },
        create: {
            email,
            password: hashedPassword,
            firstName: "Admin",
            lastName: "User",
            isActive: true,
        },
    });
    console.log(`✅ User created/updated: ${user.email}`);

    // 4. Link User to Org
    await prisma.userOrgMap.upsert({
        where: {
            userId_orgId: {
                userId: user.id,
                orgId: org.id,
            },
        },
        update: {
            role: "admin",
        },
        create: {
            userId: user.id,
            orgId: org.id,
            role: "admin",
        },
    });
    console.log("✅ User linked to Organization");

    // 5. Assign Role
    // Remove existing role to avoid conflicts
    await prisma.userRole.deleteMany({
        where: {
            userId: user.id,
            roleId: role.id,
            orgId: org.id,
        }
    });

    await prisma.userRole.create({
        data: {
            userId: user.id,
            roleId: role.id,
            orgId: org.id,
            locationId: null,
        }
    });

    console.log("✅ Role assigned to User");

    console.log("\n🎉 Admin setup complete!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
