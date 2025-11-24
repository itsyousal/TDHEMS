import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@doughhouse.com";
    const password = "AdminPassword123!";

    console.log(`🔍 Verifying user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            userRoles: {
                include: {
                    role: true,
                }
            }
        }
    });

    if (!user) {
        console.error("❌ User not found in DB!");
        return;
    }

    console.log(`✅ User found: ${user.id}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Roles: ${user.userRoles.map(r => r.role.name).join(", ")}`);

    const hash = user.password;
    console.log(`   Hash: ${hash.substring(0, 10)}...`);

    const match = await bcrypt.compare(password, hash);
    if (match) {
        console.log("✅ Password match confirmed locally!");
    } else {
        console.error("❌ Password mismatch!");
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
