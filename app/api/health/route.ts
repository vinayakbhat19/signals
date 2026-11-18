import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  let dbStatus: 'ok' | 'degraded' = 'ok';
  let dbError: string | null = null;

  try {
    const supabase = createPublicClient();
    const result = await Promise.race([
      supabase.from('venues').select('id').limit(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DB health check timeout')), 3000)
      ),
    ]);
    if (result.error) {
      dbStatus = 'degraded';
      dbError = result.error.message;
    }
  } catch (err) {
    dbStatus = 'degraded';
    dbError = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json(
    {
      ok: dbStatus === 'ok',
      database: dbStatus,
      latencyMs: Date.now() - startedAt,
      error: dbError,
      timestamp: new Date().toISOString(),
      version: '0.2.0-neon',
    },
    {
      status: dbStatus === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
