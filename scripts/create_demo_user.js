const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@doughhouse.local';
  const plain = 'password123';
  const hash = await bcrypt.hash(plain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      firstName: 'Demo',
      lastName: 'Admin',
      isActive: true,
    },
    create: {
      email,
      password: hash,
      firstName: 'Demo',
      lastName: 'Admin',
      isActive: true,
    },
  });

  console.log('Demo user upserted:', user.id, user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
