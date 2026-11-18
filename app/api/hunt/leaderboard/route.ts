import { NextResponse } from 'next/server';
import { getHunt, getLeaderboard, listStampPoints } from '@/lib/data/hunt';
import { readWithFallback } from '@/lib/resilience';

export const revalidate = 15;

export async function GET() {
  const [huntRes, boardRes, pointsRes] = await Promise.all([
    readWithFallback('api:hunt:config', () => getHunt(), null, 3000),
    readWithFallback('api:hunt:board', () => getLeaderboard(20), [], 3000),
    readWithFallback('api:hunt:points', () => listStampPoints(), [], 3000),
  ]);

  return NextResponse.json(
    {
      hunt: huntRes.data,
      leaderboard: boardRes.data,
      totalPoints: pointsRes.data.length,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      },
    }
  );
}
