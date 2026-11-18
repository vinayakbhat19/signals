import type { Metadata } from 'next';
import { HuntClient } from '@/components/hunt-client';
import { getProfile } from '@/lib/auth';
import {
  getHunt,
  getLeaderboard,
  getMyStamps,
  isStampPointLive,
  listStampPoints,
} from '@/lib/data/hunt';
import { readWithFallback } from '@/lib/resilience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Stamp Hunt',
  description:
    'Collect campus stamps at Fiest 2026 competitions, earn points, and climb the live leaderboard.',
};

export default async function HuntPage() {
  const [huntRes, pointsRes, leaderboardRes, profile] = await Promise.all([
    readWithFallback('hunt:config', () => getHunt(), null, 3000),
    readWithFallback('hunt:points', () => listStampPoints(), [], 3000),
    readWithFallback('hunt:leaderboard', () => getLeaderboard(100), [], 3000),
    getProfile(),
  ]);

  const myStamps = profile ? await getMyStamps(profile.id) : [];
  const now = new Date();
  const livePointIds = pointsRes.data
    .filter((p) => isStampPointLive(p, now))
    .map((p) => p.id);

  return (
    <HuntClient
      hunt={huntRes.data}
      points={pointsRes.data}
      livePointIds={livePointIds}
      leaderboard={leaderboardRes.data}
      userId={profile?.id ?? null}
      myDisplayName={profile?.full_name ?? null}
      myStamps={myStamps}
      initialHidden={profile?.leaderboard_hidden ?? false}
      serverTime={now.toISOString()}
    />
  );
}
