import { NextResponse } from 'next/server';
import { getLiveData, type LiveData } from '@/lib/data/live';
import { readWithFallback } from '@/lib/resilience';

export const revalidate = 15;

const EMPTY_LIVE: LiveData = {
  now: [],
  next: [],
  announcements: [],
  urgent: null,
  serverTime: new Date(0).toISOString(),
};

export async function GET() {
  const result = await readWithFallback(
    'api:live',
    () => getLiveData(),
    { ...EMPTY_LIVE, serverTime: new Date().toISOString() },
    3000
  );

  return NextResponse.json(
    {
      ...result.data,
      _source: result.source,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      },
    }
  );
}
