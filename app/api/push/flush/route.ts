import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { flushPushQueue } from '@/lib/push';

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('x-cron-secret') || '';

  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured.' },
      { status: 503 }
    );
  }

  let match = false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    match = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    match = false;
  }

  if (!match) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const result = await flushPushQueue();
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
