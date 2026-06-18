export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    try {
      const size = JSON.stringify(result).length;
      // eslint-disable-next-line no-console
      console.log(`[PERF] ${label} completed in ${duration}ms size=${size} bytes`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`[PERF] ${label} completed in ${duration}ms`);
    }
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[PERF] ${label} failed in ${duration}ms`);
    throw err;
  }
}
