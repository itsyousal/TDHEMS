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

const enablePrismaQueryLogging = process.env.ENABLE_PRISMA_SLOW_QUERY_LOGGING === 'true';
const slowQueryThresholdMs = parseInt(process.env.PRISMA_SLOW_QUERY_MS || '200', 10);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: enablePrismaQueryLogging
      ? ['query', 'info', 'warn', 'error']
      : process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

// If enabled, register a slow-query listener that highlights queries above threshold
if (enablePrismaQueryLogging) {
  // Prisma emits 'query' events with { query, params, duration } in ms
  // Use a non-throwing handler to avoid impacting runtime.
  try {
    // @ts-ignore - runtime event typing
    prisma.$on('query', (e: any) => {
      try {
        const dur = typeof e.duration === 'number' ? e.duration : undefined;
        if (dur !== undefined && dur >= slowQueryThresholdMs) {
          // Log slow query with trimmed params to avoid leaking large payloads
          const safeParams = typeof e.params === 'string' && e.params.length > 200 ? e.params.slice(0, 200) + '...' : e.params;
          console.warn(`[PRISMA][SLOW_QUERY] ${dur}ms — ${e.query} — params=${safeParams}`);
        }
      } catch (inner) {
        console.warn('Error in Prisma slow-query logger', inner);
      }
    });
  } catch (err) {
    console.warn('Prisma slow-query logging setup failed', err);
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
