const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const res = await prisma.order.aggregate({
      where: { paymentStatus: 'paid' },
      _sum: { netAmount: true, taxAmount: true },
      _count: true,
    });
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
