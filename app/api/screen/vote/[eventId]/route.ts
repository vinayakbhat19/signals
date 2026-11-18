import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { getPollByEvent, getPollResults } from '@/lib/data/voting';
import { createClient } from '@/lib/supabase/server';
import type { LiveCodeResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const profile = await getProfile();
  if (
    !profile ||
    !['volunteer', 'scorer', 'organiser', 'admin'].includes(profile.role)
  ) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const { eventId } = await context.params;
  const poll = await getPollByEvent(eventId);
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const [results, codeRes] = await Promise.all([
    getPollResults(poll.id),
    poll.require_code
      ? supabase.rpc('get_vote_code', { p_poll: poll.id })
      : Promise.resolve({ data: null, error: null }),
  ]);

  const liveCode = (codeRes.data as unknown as LiveCodeResult | null) ?? null;

  return NextResponse.json(
    {
      poll,
      results,
      liveCode,
      serverTime: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
