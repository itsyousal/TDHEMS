import { PrismaClient } from '@prisma/client';
import { menuItems } from '../data/menu-items';

const prisma = new PrismaClient();

async function main() {
  const orgSlug = process.env.SEED_ORG_SLUG || 'dough-house-hq';
  const organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!organization) {
    throw new Error(`Organization with slug '${orgSlug}' not found.`);
  }

  console.log(`Seeding ${menuItems.length} menu items into org ${organization.slug}`);

  for (const item of menuItems) {
    const costPrice = Math.max(1, Math.round(item.basePrice * 0.45));
    await prisma.sku.upsert({
      where: { orgId_code: { orgId: organization.id, code: item.code } },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        basePrice: item.basePrice,
        costPrice,
        isActive: true,
      },
      create: {
        orgId: organization.id,
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        basePrice: item.basePrice,
        costPrice,
        unit: 'unit',
        isActive: true,
      },
    });
  }

  console.log('Menu seeding complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
