import type { Metadata } from 'next';
import { HuntClueClient } from '@/components/hunt-clue-client';
import { getProfile } from '@/lib/auth';
import {
  getHunt,
  getLeaderboard,
  getMyHuntPassport,
} from '@/lib/data/hunt';
import { readWithFallback } from '@/lib/resilience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Treasure Hunt',
  description:
    "Follow clues around SDMCET campus, scan hidden Fiesta'26 QR stickers, earn points, and win prizes.",
};

export default async function HuntPage() {
  const [huntRes, clues, leaderboardRes, profile] = await Promise.all([
    readWithFallback('hunt:config', () => getHunt(), null, 3000),
    getMyHuntPassport(),
    readWithFallback('hunt:leaderboard', () => getLeaderboard(100), [], 3000),
    getProfile(),
  ]);

  return (
    <HuntClueClient
      hunt={huntRes.data}
      clues={clues}
      leaderboard={leaderboardRes.data}
      userId={profile?.id ?? null}
      myDisplayName={profile?.full_name ?? null}
      initialHidden={profile?.leaderboard_hidden ?? false}
    />
  );
}
