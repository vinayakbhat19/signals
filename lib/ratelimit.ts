import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type RateLimitSource = 'upstash' | 'database' | 'memory';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  failMode?: 'open' | 'closed';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  source: RateLimitSource;
  hits?: number;
}

interface MemoryBucket {
  windowStart: number;
  hits: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();
let lastObservedSource: RateLimitSource = 'memory';

export function getLastRateLimitSource(): RateLimitSource {
  return lastObservedSource;
}

function checkMemory(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = memoryBuckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    memoryBuckets.set(key, { windowStart: now, hits: 1 });
    // Prevent unbounded growth
    if (memoryBuckets.size > 5000) {
      const oldestKey = memoryBuckets.keys().next().value;
      if (oldestKey) memoryBuckets.delete(oldestKey);
    }
    return { allowed: true, retryAfter: 0, source: 'memory', hits: 1 };
  }

  existing.hits += 1;
  const remainingMs = Math.max(0, existing.windowStart + windowMs - now);
  return {
    allowed: existing.hits <= limit,
    retryAfter: existing.hits <= limit ? 0 : Math.ceil(remainingMs / 1000),
    source: 'memory',
    hits: existing.hits,
  };
}

async function checkUpstash(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rl:${key}:${bucket}`;

  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, windowSeconds],
      ['TTL', redisKey],
    ]),
    signal: AbortSignal.timeout(300),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Upstash HTTP ${res.status}`);
  }

  const results = (await res.json()) as Array<{ result?: number }>;
  const hits = Number(results[0]?.result ?? 1);
  const ttl = Math.max(1, Number(results[2]?.result ?? windowSeconds));

  return {
    allowed: hits <= limit,
    retryAfter: hits <= limit ? 0 : ttl,
    source: 'upstash',
    hits,
  };
}

async function checkDatabase(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  const admin = createAdminClient();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('rate_hit timeout')), 300)
  );

  // Use untyped RPC invoke so rate_hit works cleanly regardless of schema version
  const rpcPromise = (
    admin as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{
        data: { allowed?: boolean; hits?: number; retry_after?: number } | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc('rate_hit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
  if (error || !data) {
    throw new Error(error?.message || 'rate_hit failed');
  }

  return {
    allowed: Boolean(data.allowed),
    retryAfter: Number(data.retry_after ?? 0),
    source: 'database',
    hits: Number(data.hits ?? 0),
  };
}

/**
 * 3-tier rate limiter with automatic fallback:
 * Upstash Redis (300 ms) -> Postgres rate_hit() (300 ms) -> in-memory Map.
 * Never throws. Respects failMode: 'closed' for sign-up & password reset
 * when both remote limiters are configured/expected and unreachable.
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, windowSeconds, failMode = 'open' } = options;

  // Tier 1: Upstash Redis
  let upstashFailed = false;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const result = await checkUpstash(key, limit, windowSeconds);
      if (result) {
        lastObservedSource = 'upstash';
        return result;
      }
    } catch {
      upstashFailed = true;
    }
  }

  // Tier 2: Supabase database rate_hit()
  let dbFailed = false;
  try {
    const result = await checkDatabase(key, limit, windowSeconds);
    if (result) {
      lastObservedSource = 'database';
      return result;
    }
  } catch {
    dbFailed = true;
  }

  // Tier 3: In-memory fallback
  lastObservedSource = 'memory';
  if (failMode === 'closed' && upstashFailed && dbFailed) {
    return {
      allowed: false,
      retryAfter: 60,
      source: 'memory',
    };
  }

  return checkMemory(key, limit, windowSeconds);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export function isSameOriginRequest(headers: Headers): boolean {
  const origin = headers.get('origin');
  if (!origin) return true; // non-CORS same-origin or server-side call
  const host = headers.get('host');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const parsedOrigin = new URL(origin);
    if (host && parsedOrigin.host === host) return true;
    if (siteUrl && parsedOrigin.origin === new URL(siteUrl).origin) return true;
  } catch {
    return false;
  }
  return false;
}
