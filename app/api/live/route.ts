import { NextResponse } from 'next/server';
import { getLiveData } from '@/lib/data/live';

export const revalidate = 15;

export async function GET() {
  try {
    const data = await getLiveData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[api/live] GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to load live fest data.' },
      { status: 500 }
    );
  }
}
