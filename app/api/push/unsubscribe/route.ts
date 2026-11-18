import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';

const UnsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const parsed = UnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid endpoint.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    await (
      admin as unknown as {
        from: (t: string) => {
          delete: () => { eq: (k: string, v: string) => Promise<unknown> };
        };
      }
    )
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', parsed.data.endpoint);
  } catch {
    // Graceful no-op
  }

  return NextResponse.json({ ok: true });
}
