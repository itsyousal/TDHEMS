#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up test data...');

  // 1) Remove test users (email like test.employee+% )
  const testUsers = await prisma.user.findMany({ where: { email: { startsWith: 'test.employee+' } } });
  for (const u of testUsers) {
    console.log('Removing test user:', u.email, u.id);

    // Delete attendance events
    const delAtt = await prisma.attendanceEvent.deleteMany({ where: { userId: u.id } });
    console.log('  - attendance events deleted:', delAtt.count);

    // Delete userRoles
    const delUR = await prisma.userRole.deleteMany({ where: { userId: u.id } });
    console.log('  - userRoles deleted:', delUR.count);

    // Delete userOrgMap
    const delUOM = await prisma.userOrgMap.deleteMany({ where: { userId: u.id } });
    console.log('  - userOrgMap deleted:', delUOM.count);

    // Find and delete employee record
    const emp = await prisma.employee.findFirst({ where: { userId: u.id } });
    if (emp) {
      await prisma.employee.delete({ where: { id: emp.id } });
      console.log('  - employee deleted:', emp.id);
    }

    // Delete sessions
    const delSess = await prisma.session.deleteMany({ where: { userId: u.id } }).catch(() => ({ count: 0 }));
    console.log('  - sessions deleted:', delSess.count || 0);

    // Finally delete user
    await prisma.user.delete({ where: { id: u.id } });
    console.log('  - user deleted');
  }

  // 2) Remove orders created by the script: orderNumber startsWith 'ORD-' and createdAt within last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({ where: { orderNumber: { startsWith: 'ORD-' }, createdAt: { gte: twoHoursAgo } } });
  for (const o of orders) {
    console.log('Removing order:', o.id, o.orderNumber);
    // Delete order items first (cascade will handle but be explicit)
    const delItems = await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    console.log('  - order items deleted:', delItems.count);
    await prisma.order.delete({ where: { id: o.id } });
    console.log('  - order deleted');
  }

  // 3) Remove SKUs created by script: codes starting with ESP- or EGG- (recent)
  const skus = await prisma.sku.findMany({ where: { OR: [ { code: { startsWith: 'ESP-' } }, { code: { startsWith: 'EGG-' } } ] } });
  for (const s of skus) {
    console.log('Removing SKU:', s.code, s.id);
    // Delete inventory entries for this SKU
    const delInv = await prisma.inventory.deleteMany({ where: { skuId: s.id } });
    console.log('  - inventory deleted:', delInv.count);
    // Delete sku mappings, order items, then sku
    await prisma.orderItem.deleteMany({ where: { skuId: s.id } }).catch(() => null);
    await prisma.sku.delete({ where: { id: s.id } });
    console.log('  - sku deleted');
  }

  console.log('Cleanup complete.');
}

main()
  .catch(async (e) => {
    console.error('Cleanup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
