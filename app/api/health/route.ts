import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';
import { getLastRateLimitSource, rateLimit } from '@/lib/ratelimit';
import { getSnapshotAgeSeconds } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let dbStatus: 'ok' | 'down' = 'down';
  let dbLatencyMs: number | null = null;
  let authStatus: 'ok' | 'down' = 'down';

  // 1. Database ping
  try {
    const supabase = createPublicClient();
    const pingStart = Date.now();
    const { error } = await Promise.race([
      supabase.from('venues').select('id').limit(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('db timeout')), 2500)
      ),
    ]);
    if (!error) {
      dbStatus = 'ok';
      dbLatencyMs = Date.now() - pingStart;
    }
  } catch {
    dbStatus = 'down';
  }

  // 2. Auth ping
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const authRes = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        signal: AbortSignal.timeout(2500),
        cache: 'no-store',
      });
      if (authRes.ok) authStatus = 'ok';
    }
  } catch {
    authStatus = 'down';
  }

  // 3. Probe rate limiter source (lightweight probe key)
  let limiterSource = getLastRateLimitSource();
  try {
    const probe = await rateLimit('health-probe', {
      limit: 100000,
      windowSeconds: 60,
      failMode: 'open',
    });
    limiterSource = probe.source;
  } catch {
    limiterSource = 'memory';
  }

  const snapshotAge = getSnapshotAgeSeconds();
  const status = dbStatus === 'ok' ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      db_latency_ms: dbLatencyMs,
      auth: authStatus,
      snapshot_age_s: snapshotAge,
      limiter: limiterSource,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      elapsed_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
