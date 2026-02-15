#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@doughhouse.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  console.log('Starting automated flow...');

  // 1) Find admin user
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    console.error('Admin user not found:', ADMIN_EMAIL);
    process.exit(1);
  }
  console.log('Found admin:', admin.id);

  // 1b) Determine org and location to use
  let userOrg = await prisma.userOrgMap.findFirst({ where: { userId: admin.id } });
  if (!userOrg) {
    // fallback: pick first org
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.error('No organization found in DB. Cannot continue.');
      process.exit(1);
    }
    userOrg = { orgId: org.id };
    console.log('Using org (fallback):', org.id);
  } else {
    console.log('Using admin org:', userOrg.orgId);
  }

  // Ensure there is at least one location for the org
  // Select only necessary fields to avoid querying dropped columns
  let location = await prisma.location.findFirst({ where: { orgId: userOrg.orgId }, select: { id: true, name: true } });
  if (!location) {
    location = await prisma.location.create({ data: { orgId: userOrg.orgId, name: 'Default Location', slug: 'default', type: 'store' } });
    console.log('Created default location:', location.id);
  } else {
    console.log('Using location:', location.id);
  }

  // 2) Add a test employee
  const timestamp = Date.now();
  const empEmail = `test.employee+${timestamp}@doughhouse.local`;
  const empPasswordPlain = 'employee123';
  const hashed = await bcrypt.hash(empPasswordPlain, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: empEmail,
      password: hashed,
      firstName: 'Test',
      lastName: 'Employee',
      isActive: true,
      activationDate: new Date(),
    }
  });
  console.log('Created user:', user.id, empEmail);

  // Create employee record
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      orgId: userOrg.orgId,
      employeeId: `TST-${timestamp}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: empEmail,
      joinDate: new Date(),
      status: 'active'
    }
  });
  console.log('Created employee record:', employee.id);

  // Assign employee role if exists
  const employeeRole = await prisma.role.findFirst({ where: { slug: 'employee' } });
  if (employeeRole) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: employeeRole.id, orgId: userOrg.orgId } });
    console.log('Assigned employee role');
  } else {
    console.log('No `employee` role found; skipping role assignment');
  }

  // 3) (Logout) - not applicable for DB script

  // 5) Clock in for the shift (create attendance event)
  const clockIn = await prisma.attendanceEvent.create({
    data: {
      userId: user.id,
      employeeId: employee.id,
      eventType: 'clock_in',
      eventTime: new Date(),
      location: location.name,
    }
  });
  console.log('Clock-in event created:', clockIn.id);

  // 6) Submit a test order for 3 espressos (ordered via zomato today at 1pm order value 300)
  // Ensure channelSource 'zomato' exists
  let channel = await prisma.channelSource.findFirst({ where: { slug: 'zomato' } });
  if (!channel) {
    channel = await prisma.channelSource.create({ data: { name: 'zomato', slug: 'zomato' } });
    console.log('Created channelSource zomato:', channel.id);
  }

  // Ensure SKU Espresso exists
  let espressoSku = await prisma.sku.findFirst({ where: { name: { contains: 'espresso', mode: 'insensitive' } } });
  if (!espressoSku) {
    espressoSku = await prisma.sku.create({ data: { orgId: userOrg.orgId, code: `ESP-${timestamp}`, name: 'Espresso', unit: 'unit', basePrice: 100, costPrice: 50 } });
    console.log('Created Espresso SKU:', espressoSku.id);
  }

  const order = await prisma.order.create({
    data: {
      orgId: userOrg.orgId,
      locationId: location.id,
      channelSourceId: channel.id,
      orderNumber: `ORD-${timestamp}`,
      status: 'pending',
      totalAmount: 300,
      netAmount: 300,
      items: {
        create: [
          {
            skuId: espressoSku.id,
            quantity: 3,
            unitPrice: 100,
            totalPrice: 300,
          }
        ]
      }
    }
  });
  console.log('Created order:', order.id);

  // 7) Submit a purchase order for 100 eggs: create SKU Eggs and inventory record for 100 units
  let eggsSku = await prisma.sku.findFirst({ where: { name: { contains: 'egg', mode: 'insensitive' } } });
  if (!eggsSku) {
    eggsSku = await prisma.sku.create({ data: { orgId: userOrg.orgId, code: `EGG-${timestamp}`, name: 'Eggs', unit: 'unit', basePrice: 0, costPrice: 0 } });
    console.log('Created Eggs SKU:', eggsSku.id);
  }

  // Create or update inventory for eggs at location
  let inventory = null;
  try {
    inventory = await prisma.inventory.findUnique({ where: { locationId_skuId: { locationId: location.id, skuId: eggsSku.id } } });
  } catch (e) {
    // ignore lookup errors
  }
  if (!inventory) {
    inventory = await prisma.inventory.create({ data: { orgId: userOrg.orgId, locationId: location.id, skuId: eggsSku.id, quantity: 100, availableQuantity: 100 } });
    console.log('Created inventory for eggs:', inventory.id);
  } else {
    inventory = await prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: inventory.quantity + 100, availableQuantity: inventory.availableQuantity + 100 } });
    console.log('Updated inventory for eggs:', inventory.id);
  }

  // 8) Clock out
  const clockOut = await prisma.attendanceEvent.create({
    data: {
      userId: user.id,
      employeeId: employee.id,
      eventType: 'clock_out',
      eventTime: new Date(),
      location: location.name,
    }
  });
  console.log('Clock-out event created:', clockOut.id);

  console.log('\nAutomated flow completed successfully.');
  console.log('Test employee credentials: ', empEmail, empPasswordPlain);
}

main()
  .catch(async (e) => {
    console.error('Error running automated flow:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
