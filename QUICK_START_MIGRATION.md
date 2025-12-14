# Quick Start: Migrating Menu Data

## You need to run the migration script to populate the database!

Currently, your database tables (`ProductVariation` and `ProductAddon`) are empty. The static file `data/menu-items.ts` has the variations, but they need to be migrated to the database.

### Step 1: Find Your Organization ID

Open Prisma Studio:
```bash
npx prisma studio
```

1. Click on the `Organization` table
2. Copy your organization's `id` (it will look like: `abc123-def456-ghi789`)

### Step 2: Run the Migration Script

```bash
npx ts-node scripts/migrate-menu-data.ts <YOUR_ORG_ID>
```

**Example:**
```bash
npx ts-node scripts/migrate-menu-data.ts 12345678-abcd-1234-abcd-123456789012
```

### What This Does

The script will:
- ✅ Create/update all SKUs from `data/menu-items.ts`
- ✅ Create variations with price modifiers (e.g., Hazelnut syrup +₹20)
- ✅ Create addons with prices (e.g., Chicken ₹80)
- ✅ Show detailed progress for each item

### Expected Output

```
Processing: BEV-CAP - Cappucino
  ✓ Creating new SKU...
  ✓ Processing 3 variations...
    - Created variation: Hazelnut syrup (+₹20)
    - Created variation: Orange syrup (+₹20)
    - Created variation: Vanilla syrup (+₹20)
  ✓ Completed: Cappucino
```

### After Migration

Once complete, you'll see:
- ✅ Variations in menu management Settings dialog
- ✅ Variations in customer portal
- ✅ Ability to edit/delete/add more variations

## Alternative: Manual Entry

If you don't want to run the migration, you can manually add variations:

1. Go to `/dashboard/menu`
2. Find "BEV-CAP - Cappucino"
3. Click the Settings (gear) icon
4. Click "+ Add Variation"
5. Enter:
   - Name: "Hazelnut syrup"
   - Price Modifier: 20
6. Click "Add Variation"
7. Repeat for other variations

## Need Help?

See `MENU_MIGRATION_GUIDE.md` for complete instructions and troubleshooting.
