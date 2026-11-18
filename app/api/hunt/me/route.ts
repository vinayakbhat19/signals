import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { getLeaderboard, getMyStamps, listStampPoints } from '@/lib/data/hunt';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json(
      { signedIn: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const [myStamps, leaderboard, points] = await Promise.all([
    getMyStamps(profile.id),
    getLeaderboard(100),
    listStampPoints(),
  ]);

  const myRow = leaderboard.find((r) => r.user_id === profile.id);
  const activePointIds = new Set(points.map((p) => p.id));
  const collectedCount = myStamps.filter((s) =>
    activePointIds.has(s.point_id)
  ).length;

  return NextResponse.json(
    {
      signedIn: true,
      stamps: collectedCount,
      total: points.length,
      rank: myRow?.rank ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
