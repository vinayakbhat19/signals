import { notFound } from 'next/navigation';
import { StampStationClient } from '@/components/stamp-station-client';
import { requireVolunteer } from '@/lib/auth';
import { getStampPoint } from '@/lib/data/hunt';
import { createClient } from '@/lib/supabase/server';
import type { LiveCodeResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function loadStationInitialState(pointId: string) {
  const nowMs = Date.now();
  const oneMinAgo = new Date(nowMs - 60_000).toISOString();
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
      .gte('scanned_at', oneMinAgo),
  ]);

  const live = (codeRes.data as unknown as LiveCodeResult | null) ?? {
    code: '',
    expires_in: 30,
  };

  return {
    nowMs,
    state: {
      code: live.code,
      expires_in: live.expires_in,
      total_stamps: totalRes.count ?? 0,
      last_minute: recentRes.count ?? 0,
    },
  };
}

export default async function StampStationPage({
  params,
}: {
  params: Promise<{ pointId: string }>;
}) {
  await requireVolunteer();

  const { pointId } = await params;
  const point = await getStampPoint(pointId);
  if (!point) {
    notFound();
  }

  const { nowMs, state } = await loadStationInitialState(pointId);

  const bonusActive =
    point.bonus_from !== null &&
    nowMs >= new Date(point.bonus_from).getTime() &&
    nowMs <= new Date(point.bonus_to ?? point.bonus_from).getTime();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return (
    <StampStationClient
      pointId={point.id}
      pointName={point.name}
      venueName={point.venue_name}
      endsAt={point.event?.ends_at ?? null}
      bonusActive={bonusActive}
      siteUrl={siteUrl}
      initialState={state}
    />
  );
}
