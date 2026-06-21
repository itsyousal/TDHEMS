type CacheEntry<T> = { value: T; expiresAt: number };

const DEFAULT_TTL = 30 * 1000; // 30s

// In-memory fallback
const store = new Map<string, CacheEntry<any>>();

// Optional Redis client (lazy)
let redisClient: any = null;
const REDIS_URL = process.env.REDIS_URL || process.env.NEXT_REDIS_URL || '';

if (REDIS_URL) {
  try {
    // Lazy require to avoid dev-time dependency when not used
    // Use eval('require') to avoid bundler static analysis attempting to resolve the module
    // when it's not installed in dev environments.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const IORedis = eval('require')('ioredis');
    redisClient = new IORedis(REDIS_URL);
    redisClient.on('error', (err: any) => console.warn('Redis error', err));
    console.log('Cache: using Redis at', REDIS_URL);
  } catch (err) {
    console.warn('Cache: ioredis not installed or failed to initialize, falling back to in-memory cache');
    redisClient = null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL) {
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'PX', ttlMs);
      return;
    } catch (err) {
      console.warn('cacheSet redis failed', err);
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (redisClient) {
    try {
      const v = await redisClient.get(key);
      if (!v) return undefined;
      return JSON.parse(v) as T;
    } catch (err) {
      console.warn('cacheGet redis failed', err);
    }
  }
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export async function cacheDel(key: string) {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.warn('cacheDel redis failed', err);
    }
  }
  store.delete(key);
}

export async function cacheDelPrefix(prefix: string) {
  if (redisClient) {
    try {
      // Use SCAN loop to avoid blocking Redis with KEYS on large keyspaces.
      let cursor = '0';
      do {
        // scan returns [nextCursor, keys]
        const res = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = res[0];
        const keys = res[1] || [];
        if (keys.length) {
          // split into chunks to avoid argument list too long
          for (let i = 0; i < keys.length; i += 100) {
            const chunk = keys.slice(i, i + 100);
            await redisClient.del(...chunk);
          }
        }
      } while (cursor !== '0');
      return;
    } catch (err) {
      console.warn('cacheDelPrefix redis failed', err);
    }
  }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function cacheClear() {
  if (redisClient) {
    try {
      // best-effort
      redisClient.flushdb().catch(() => null);
      return;
    } catch (_) {}
  }
  store.clear();
}

export function cacheStats() {
  return { keys: store.size, redis: !!redisClient };
}

export default { cacheGet, cacheSet, cacheDel, cacheDelPrefix, cacheClear, cacheStats };
