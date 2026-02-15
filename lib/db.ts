import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// In production, we want to ensure we don't exhaust connections.
// While Supabase Transaction Pooler (port 6543) matches the best,
// limiting the client to 1 connection per lambda is a safe guard.
const connectionString = process.env.DATABASE_URL;

// Check if we are in production and missing pgbouncer
if (process.env.NODE_ENV === 'production' && connectionString && !connectionString.includes('pgbouncer=true')) {
  console.warn(
    'WARNING: DATABASE_URL does not explicitly enable pgbouncer=true. ' +
    'This may cause connection exhaustion in serverless environments.'
  );
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Using transaction pooler is recommended, but explicit connection limits
    // can be set via connection parameters or datasource overrides if needed.
    // For now, we rely on the recommended Supabase setup.
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
