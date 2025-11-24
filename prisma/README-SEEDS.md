# Seed Files - DISABLED

## Status: SEED FILES HAVE BEEN DISABLED

The seed files in this directory have been renamed to `.backup` to prevent accidental execution of demo data seeding.

## Disabled Files

- `seed.ts.backup` - Main seed file (roles, permissions, organization)
- `seed-demo-data.ts.backup` - Demo data seed file (SKUs, orders, inventory, production batches, warehouses, bins)

## Why Were They Disabled?

The user requested that **no dummy data or placeholders** should exist in the database. The seed scripts were creating sample data that was not desired for the production/development environment.

## How to Re-enable (If Needed in Future)

If you need to re-enable seeding for testing or development purposes:

1. **Rename the files back:**
   ```powershell
   Move-Item -Path "prisma\seed.ts.backup" -Destination "prisma\seed.ts"
   Move-Item -Path "prisma\seed-demo-data.ts.backup" -Destination "prisma\seed-demo-data.ts"
   ```

2. **Add the seed script back to package.json:**
   ```json
   "scripts": {
     "prisma:seed": "node --loader ts-node/esm prisma/seed.ts"
   }
   ```

3. **Run the seed:**
   ```bash
   npm run prisma:seed
   ```

## Important Notes

- The seed files are preserved as `.backup` for reference
- No automatic seeding occurs on dev server start
- Seeds only run when explicitly executed via `npm run prisma:seed`
- The `prisma:seed` script has been removed from `package.json`
