/**
 * Migration Script: Static Menu Data → Database
 * 
 * This script migrates menu data from the static file (data/menu-items.ts)
 * into the database tables (Sku, ProductVariation, ProductAddon).
 * 
 * Usage: npx ts-node scripts/migrate-menu-data.ts <orgId>
 */

import { PrismaClient } from '@prisma/client';
import { menuItems, MenuItemData } from '../data/menu-items.js';

const prisma = new PrismaClient();

// Variation price modifiers (these are approximate - adjust as needed)
const VARIATION_PRICES: Record<string, number> = {
  'Hazelnut syrup': 20,
  'Orange syrup': 20,
  'Vanilla syrup': 20,
  'Cranberry syrup': 25,
  'Coke': 30,
  'Strawberry': 30,
  'Peach': 30,
  'Mango (seasonal) syrup': 35,
};

// Addon prices (these are approximate - adjust as needed)
const ADDON_PRICES: Record<string, number> = {
  'Chicken': 80,
  'Vanilla Ice Cream': 40,
};

interface MigrationResult {
  success: boolean;
  skusCreated: number;
  skusUpdated: number;
  variationsCreated: number;
  addonsCreated: number;
  errors: string[];
}

async function migrateMenuItem(
  item: MenuItemData,
  orgId: string,
  result: MigrationResult
): Promise<void> {
  try {
    console.log(`\nProcessing: ${item.code} - ${item.name}`);

    // Check if SKU already exists
    const existingSku = await prisma.sku.findFirst({
      where: {
        code: item.code,
        orgId: orgId,
      },
      include: {
        variations: true,
        addons: true,
      },
    });

    let sku;

    if (existingSku) {
      console.log(`  ✓ SKU exists, updating...`);
      
      // Update existing SKU
      sku = await prisma.sku.update({
        where: { id: existingSku.id },
        data: {
          name: item.name,
          description: item.description,
          category: item.category,
          basePrice: item.basePrice,
          status: 'active',
          isActive: true,
        },
      });
      
      result.skusUpdated++;
    } else {
      console.log(`  ✓ Creating new SKU...`);
      
      // Create new SKU
      sku = await prisma.sku.create({
        data: {
          code: item.code,
          name: item.name,
          description: item.description,
          category: item.category,
          basePrice: item.basePrice,
          costPrice: item.basePrice * 0.4, // 40% cost estimate
          unit: 'unit',
          inventoryType: 'FINISHED',
          status: 'active',
          isActive: true,
          orgId: orgId,
        },
      });
      
      result.skusCreated++;

      // Create inventory records for all locations in the org
      const locations = await prisma.location.findMany({
        where: { orgId: orgId },
      });

      for (const location of locations) {
        await prisma.inventory.create({
          data: {
            orgId: orgId,
            skuId: sku.id,
            locationId: location.id,
            quantity: 0,
            reservedQuantity: 0,
            availableQuantity: 0,
            reorderLevel: 10,
            reorderQuantity: 50,
          },
        });
      }
    }

    // Process variations
    if (item.variations && item.variations.length > 0) {
      console.log(`  ✓ Processing ${item.variations.length} variations...`);
      
      for (let i = 0; i < item.variations.length; i++) {
        const variationName = item.variations[i];
        const priceModifier = VARIATION_PRICES[variationName] || 0;

        // Check if variation already exists
        const existingVariation = await prisma.productVariation.findFirst({
          where: {
            skuId: sku.id,
            name: variationName,
          },
        });

        if (!existingVariation) {
          await prisma.productVariation.create({
            data: {
              skuId: sku.id,
              name: variationName,
              priceModifier: priceModifier,
              sortOrder: i,
              isActive: true,
            },
          });
          
          result.variationsCreated++;
          console.log(`    - Created variation: ${variationName} (+₹${priceModifier})`);
        } else {
          console.log(`    - Variation exists: ${variationName}`);
        }
      }
    }

    // Process addons
    if (item.addOns && item.addOns.length > 0) {
      console.log(`  ✓ Processing ${item.addOns.length} addons...`);
      
      for (let i = 0; i < item.addOns.length; i++) {
        const addonName = item.addOns[i];
        const price = ADDON_PRICES[addonName] || 50; // Default 50 if not found

        // Check if addon already exists
        const existingAddon = await prisma.productAddon.findFirst({
          where: {
            skuId: sku.id,
            name: addonName,
          },
        });

        if (!existingAddon) {
          await prisma.productAddon.create({
            data: {
              skuId: sku.id,
              name: addonName,
              price: price,
              sortOrder: i,
              isActive: true,
            },
          });
          
          result.addonsCreated++;
          console.log(`    - Created addon: ${addonName} (₹${price})`);
        } else {
          console.log(`    - Addon exists: ${addonName}`);
        }
      }
    }

    console.log(`  ✓ Completed: ${item.name}`);
  } catch (error) {
    const errorMsg = `Failed to migrate ${item.code}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`  ✗ ${errorMsg}`);
    result.errors.push(errorMsg);
  }
}

async function migrateAllMenuData(orgId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    skusCreated: 0,
    skusUpdated: 0,
    variationsCreated: 0,
    addonsCreated: 0,
    errors: [],
  };

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           MENU DATA MIGRATION SCRIPT                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nOrganization ID: ${orgId}`);
  console.log(`Total menu items to process: ${menuItems.length}`);
  console.log('─'.repeat(64));

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    console.error(`\n✗ Error: Organization with ID '${orgId}' not found`);
    result.success = false;
    result.errors.push('Organization not found');
    return result;
  }

  console.log(`✓ Organization found: ${org.name}`);

  // Process each menu item
  for (const item of menuItems) {
    await migrateMenuItem(item, orgId, result);
  }

  return result;
}

async function main() {
  console.clear();

  // Get orgId from command line arguments
  const orgId = process.argv[2];

  if (!orgId) {
    console.error('Error: Organization ID is required');
    console.error('Usage: npx ts-node scripts/migrate-menu-data.ts <orgId>');
    console.error('\nTo find your organization ID, run:');
    console.error('  npx prisma studio');
    console.error('  Then navigate to the Organization table');
    process.exit(1);
  }

  try {
    const result = await migrateAllMenuData(orgId);

    // Print summary
    console.log('\n' + '═'.repeat(64));
    console.log('MIGRATION SUMMARY');
    console.log('═'.repeat(64));
    console.log(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log(`SKUs Created: ${result.skusCreated}`);
    console.log(`SKUs Updated: ${result.skusUpdated}`);
    console.log(`Variations Created: ${result.variationsCreated}`);
    console.log(`Addons Created: ${result.addonsCreated}`);
    
    if (result.errors.length > 0) {
      console.log(`\nErrors encountered: ${result.errors.length}`);
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    } else {
      console.log('\n✓ No errors encountered');
    }

    console.log('═'.repeat(64));

    if (result.success && result.errors.length === 0) {
      console.log('\n✓ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Verify the data in Prisma Studio or menu management page');
      console.log('  2. Update the order portal to use /api/menu endpoint');
      console.log('  3. Test the complete flow from menu management to order portal');
    } else {
      console.log('\n⚠ Migration completed with errors. Please review and retry.');
    }

  } catch (error) {
    console.error('\n✗ Fatal error during migration:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
