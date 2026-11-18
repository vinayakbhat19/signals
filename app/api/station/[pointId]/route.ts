import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { LiveCodeResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ pointId: string }> }
) {
  const profile = await getProfile();
  if (
    !profile ||
    !['volunteer', 'scorer', 'organiser', 'admin'].includes(profile.role)
  ) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const { pointId } = await context.params;
  const supabase = await createClient();

  const [codeRes, totalRes, recentRes] = await Promise.all([
    supabase.rpc('get_live_code', { p_point: pointId }),
    supabase
      .from('stamps')
      .select('user_id', { count: 'exact', head: true })
      .eq('point_id', pointId),
    supabase
      .from('stamps')
      .select('user_id', { count: 'exact', head: true })
      .eq('point_id', pointId)
      .gte('scanned_at', new Date(Date.now() - 60_000).toISOString()),
  ]);

  if (codeRes.error || !codeRes.data) {
    return NextResponse.json(
      { error: codeRes.error?.message ?? 'Could not fetch live code' },
      { status: 500 }
    );
  }

  const live = codeRes.data as unknown as LiveCodeResult;

  return NextResponse.json(
    {
      code: live.code,
      expires_in: live.expires_in,
      total_stamps: totalRes.count ?? 0,
      last_minute: recentRes.count ?? 0,
      serverTime: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
