import { NextResponse } from 'next/server';
import { getPollByEvent, getPollResults } from '@/lib/data/voting';

export const revalidate = 10;

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const poll = await getPollByEvent(eventId);
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  const results = await getPollResults(poll.id);
  return NextResponse.json(
    { poll, results, serverTime: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    }
  );
}
