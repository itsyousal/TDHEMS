const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const permissions = await prisma.permission.findMany({
      select: { id: true, slug: true, category: true },
      orderBy: { category: 'asc' }
    });
    console.log('All permissions:');
    console.log(JSON.stringify(permissions, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
