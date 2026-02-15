// src/lib/db.ts
let prisma: any = null;

try {
  // Dynamically require to avoid build-time failures when the generated client
  // is not present (e.g. CI or before `prisma generate`). If the client is
  // missing, we fall back to a stub that throws at runtime when used.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');

  const globalForPrisma = global as unknown as { prisma?: any };

  prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
} catch (err: any) {
  // If the generated client is missing, warn and provide a proxy that will
  // clearly error if any method is invoked at runtime. This prevents Next.js
  // build-time module loading from failing while keeping a clear runtime
  // error message for developers.
  // eslint-disable-next-line no-console
  console.warn('[lib/db] @prisma/client not available:', err?.message || err);

  const missingMsg = 'Prisma client not generated. Run `npx prisma generate`.';
  prisma = new Proxy({}, {
    get() {
      return () => {
        throw new Error(missingMsg);
      };
    },
  });
}

export { prisma };
export default prisma;
