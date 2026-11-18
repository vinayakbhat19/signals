export type DataSource = 'db' | 'cache' | 'fallback';

export interface FallbackResult<T> {
  data: T;
  source: DataSource;
  updatedAt: string;
}

const memoryCache = new Map<string, { data: unknown; updatedAt: string }>();

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Runs a primary database read with a hard timeout (default 3 s).
 * Falls back to the last known good in-memory snapshot, then to `fallbackValue`.
 */
export async function readWithFallback<T>(
  key: string,
  primaryFn: () => Promise<T>,
  fallbackValue: T,
  timeoutMs = 3000
): Promise<FallbackResult<T>> {
  try {
    const data = await withTimeout(primaryFn(), timeoutMs);
    const updatedAt = new Date().toISOString();
    memoryCache.set(key, { data, updatedAt });
    return { data, source: 'db', updatedAt };
  } catch (error) {
    console.error(`[resilience] Primary read "${key}" failed:`, error);
    const cached = memoryCache.get(key);
    if (cached) {
      return {
        data: cached.data as T,
        source: 'cache',
        updatedAt: cached.updatedAt,
      };
    }
    return {
      data: fallbackValue,
      source: 'fallback',
      updatedAt: new Date().toISOString(),
    };
  }
}
