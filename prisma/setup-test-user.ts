/**
 * Assign owner-super-admin role to test user
 * Run with: npx ts-node prisma/setup-test-user.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestUser() {
  try {
    console.log('Setting up test user...');

    // Find test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@doughhouse.com' },
    });

    if (!testUser) {
      console.error('✗ Test user not found');
      return;
    }

    console.log('✓ Found test user:', testUser.email, '(ID:', testUser.id, ')');

    // Find or create owner-super-admin role
    const role = await prisma.role.findUnique({
      where: { slug: 'owner-super-admin' },
    });

    if (!role) {
      console.error('✗ Owner/Super Admin role not found');
      return;
    }

    console.log('✓ Found role:', role.name);

    // Find default org (or create one)
    let org = await prisma.organization.findFirst();

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Dough House',
          slug: 'dough-house',
        },
      });
      console.log('✓ Created organization:', org.name);
    } else {
      console.log('✓ Using organization:', org.name);
    }

    // Check if user already has this role
    const existing = await prisma.userRole.findFirst({
      where: {
        userId: testUser.id,
        roleId: role.id,
        orgId: org.id,
      },
    });

    if (existing) {
      console.log('✓ User already has this role');
      return;
    }

    // Assign role to user
    const userRole = await prisma.userRole.create({
      data: {
        userId: testUser.id,
        roleId: role.id,
        orgId: org.id,
      },
    });

    console.log('✓ Assigned role to test user');
    console.log('\n✓ Test user setup complete!');
    console.log('  Email:', testUser.email);
    console.log('  Role:', role.name);
    console.log('  Organization:', org.name);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestUser();
