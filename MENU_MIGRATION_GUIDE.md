# Menu System Migration Guide

## Overview

This guide covers the migration from the static menu data system to a database-backed dynamic menu management system.

## What Changed

### Before
- Menu items stored in `data/menu-items.ts` as static TypeScript arrays
- Variations and addons defined as string arrays
- No centralized management interface
- Changes required code updates and redeployment

### After
- Menu items stored in database (`Sku`, `ProductVariation`, `ProductAddon` tables)
- Variations with price modifiers, addons with prices
- Professional menu management interface at `/dashboard/menu`
- Real-time updates without code changes
- Single source of truth for both order portal and management

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Database (Single Source of Truth)      │
│  ┌──────────┐  ┌─────────────────┐  ┌─────────┐│
│  │   Sku    │  │ ProductVariation │  │ Product ││
│  │  Table   │──┤     Table        │  │ Addon   ││
│  └──────────┘  └─────────────────┘  └─────────┘│
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
┌──────▼─────────┐  ┌───────▼────────┐
│   /api/menu    │  │ /api/admin/    │
│   (Public)     │  │    menu        │
│                │  │  (Management)  │
└──────┬─────────┘  └───────┬────────┘
       │                    │
┌──────▼─────────┐  ┌───────▼────────┐
│ Order Portal   │  │ Menu Management│
│ /order         │  │ /dashboard/menu│
└────────────────┘  └────────────────┘
```

## Migration Steps

### Step 1: Get Organization ID

You need your organization ID to run the migration. Find it using:

```bash
npx prisma studio
```

Navigate to the `Organization` table and copy your organization's ID.

### Step 2: Run Migration Script

Execute the migration script with your organization ID:

```bash
npx ts-node scripts/migrate-menu-data.ts <YOUR_ORG_ID>
```

**Example:**
```bash
npx ts-node scripts/migrate-menu-data.ts abc123-def456-ghi789
```

### Step 3: Review Migration Results

The script will display:
- Number of SKUs created/updated
- Number of variations created
- Number of addons created
- Any errors encountered

**Expected Output:**
```
╔══════════════════════════════════════════════════════════════╗
║           MENU DATA MIGRATION SCRIPT                         ║
╚══════════════════════════════════════════════════════════════╝

Organization ID: abc123-def456-ghi789
Total menu items to process: 31
────────────────────────────────────────────────────────────────
✓ Organization found: Dough House

Processing: BEV-ESP - Espresso
  ✓ Creating new SKU...
  ✓ Completed: Espresso

Processing: BEV-CAP - Cappucino
  ✓ Creating new SKU...
  ✓ Processing 3 variations...
    - Created variation: Hazelnut syrup (+₹20)
    - Created variation: Orange syrup (+₹20)
    - Created variation: Vanilla syrup (+₹20)
  ✓ Completed: Cappucino

[... continues for all items ...]

════════════════════════════════════════════════════════════════
MIGRATION SUMMARY
════════════════════════════════════════════════════════════════
Status: ✓ SUCCESS
SKUs Created: 31
SKUs Updated: 0
Variations Created: 12
Addons Created: 8

✓ No errors encountered
════════════════════════════════════════════════════════════════

✓ Migration completed successfully!

Next steps:
  1. Verify the data in Prisma Studio or menu management page
  2. Update the order portal to use /api/menu endpoint
  3. Test the complete flow from menu management to order portal
```

### Step 4: Verify Migration

1. **Via Prisma Studio:**
   ```bash
   npx prisma studio
   ```
   - Check `Sku` table for all menu items
   - Check `ProductVariation` table for variations
   - Check `ProductAddon` table for addons

2. **Via Menu Management Page:**
   - Navigate to http://localhost:3000/dashboard/menu
   - Verify all items appear with correct details
   - Check that variations/addons show in the Options column
   - Click Settings button to view variations/addons for each item

### Step 5: Test Order Portal

1. Navigate to http://localhost:3000/order
2. Verify menu loads from database
3. Test adding items with variations
4. Test adding items with addons
5. Verify prices calculate correctly

## Data Structure

### Menu Item (SKU)
```typescript
{
  code: "BEV-CAP",           // Product code
  name: "Cappucino",         // Display name
  category: "Beverages",     // Category
  basePrice: 155,            // Base price in currency
  description: "Steamed milk and espresso...",
  status: "active",          // active/inactive/discontinued
  isActive: true             // Soft delete flag
}
```

### Variation
```typescript
{
  name: "Hazelnut syrup",
  priceModifier: 20,         // Amount added to base price
  sortOrder: 0,              // Display order
  isActive: true
}
```

### Addon
```typescript
{
  name: "Chicken",
  price: 80,                 // Fixed price for addon
  sortOrder: 0,
  isActive: true
}
```

## Price Mapping Reference

The migration script uses these default prices for variations and addons:

### Variations (Price Modifiers)
| Variation | Price Modifier |
|-----------|----------------|
| Hazelnut syrup | ₹20 |
| Orange syrup | ₹20 |
| Vanilla syrup | ₹20 |
| Cranberry syrup | ₹25 |
| Coke | ₹30 |
| Strawberry | ₹30 |
| Peach | ₹30 |
| Mango (seasonal) syrup | ₹35 |

### Addons (Fixed Prices)
| Addon | Price |
|-------|-------|
| Chicken | ₹80 |
| Vanilla Ice Cream | ₹40 |

**Note:** You can adjust these prices in the menu management interface after migration.

## API Endpoints

### Public Menu API
```
GET /api/menu?orgId=<YOUR_ORG_ID>
```

**Response:**
```json
{
  "items": [
    {
      "code": "BEV-CAP",
      "name": "Cappucino",
      "category": "Beverages",
      "basePrice": 155,
      "description": "...",
      "variations": [
        { "id": "...", "name": "Hazelnut syrup", "priceModifier": 20 }
      ],
      "addons": []
    }
  ],
  "grouped": [
    {
      "category": "Beverages",
      "items": [ /* items array */ ]
    }
  ]
}
```

### Admin Menu API
```
GET /api/admin/menu          # Get all menu items with variations/addons
PUT /api/admin/menu          # Update menu item
DELETE /api/admin/menu       # Delete (soft delete) menu item
```

### Product Options API
```
GET /api/admin/product-options?skuId=<SKU_ID>  # Get variations/addons
POST /api/admin/product-options                # Create variation/addon
PUT /api/admin/product-options                 # Update variation/addon
DELETE /api/admin/product-options              # Delete variation/addon
```

## Menu Management Interface

### Features
- **Stats Dashboard:** Total items, active items, average price, categories count
- **Search & Filters:** Search by name/code/description, filter by category/status
- **CRUD Operations:**
  - Add new menu items
  - Edit existing items
  - Soft delete items
  - Manage variations and addons via Settings button
- **Real-time Updates:** Changes reflect immediately in order portal

### Accessing Menu Management
1. Login as admin or manager
2. Navigate to Dashboard → Menu Management
3. Required permissions: `admin.view` or `manager.view`

## Order Portal Updates

### Changes Made
- **Before:** Imported from `data/menu-items.ts` static file
- **After:** Fetches from `/api/menu?orgId=<ORG_ID>` endpoint

### Features
- Loading states with spinner
- Error handling with retry button
- Empty state display
- Variation selection with price display
- Addon selection with price display
- Dynamic price calculation

## Troubleshooting

### Migration Script Errors

**Error: Organization not found**
```
Solution: Verify your organization ID is correct using Prisma Studio
```

**Error: Prisma client errors**
```bash
# Regenerate Prisma client
npx prisma generate
# Retry migration
npx ts-node scripts/migrate-menu-data.ts <YOUR_ORG_ID>
```

**Error: Duplicate SKU codes**
```
Solution: The script handles this - it will update existing SKUs instead of creating duplicates
```

### Menu Not Loading in Order Portal

1. **Check API Response:**
   ```bash
   curl "http://localhost:3000/api/menu?orgId=<YOUR_ORG_ID>"
   ```

2. **Check Browser Console:**
   - Open DevTools → Console
   - Look for errors in network requests

3. **Verify Organization ID:**
   - Ensure `/api/admin/meta` returns correct `org.id`

### Variations/Addons Not Showing

1. **Check Database:**
   ```bash
   npx prisma studio
   ```
   - Verify `ProductVariation` and `ProductAddon` tables have data
   - Check `isActive` is `true`

2. **Check API Response:**
   - GET `/api/admin/menu` should include `variations` and `addons` arrays

3. **Re-run Migration:**
   - If data is missing, re-run migration script (it's idempotent)

## Best Practices

### Adding New Menu Items
1. Use Menu Management interface instead of modifying static file
2. Set appropriate base price and cost price
3. Add variations/addons via Settings button
4. Test in order portal before marking as active

### Updating Prices
1. Edit item in Menu Management
2. Update basePrice for the item itself
3. Update priceModifier for variations via Settings
4. Update price for addons via Settings

### Removing Items
1. Use Delete button (soft delete - sets isActive=false)
2. Item remains in database for historical orders
3. Won't appear in order portal or new orders

### Data Consistency
- Always use Menu Management interface for changes
- Avoid direct database modifications
- Run migration script only once per organization
- Keep backup before major changes

## Next Steps

After successful migration:

1. ✅ Remove or archive `data/menu-items.ts` (keep as backup)
2. ✅ Train staff on Menu Management interface
3. ✅ Update any documentation referencing static file
4. ✅ Monitor order portal for any issues
5. ✅ Collect feedback from users

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in console/terminal
3. Verify database state in Prisma Studio
4. Check API responses in browser DevTools
