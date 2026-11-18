import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimit,
} from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_STATIC_TOPICS = new Set(['changes', 'urgent', 'vote', 'hunt']);
const EVENT_TOPIC_RE =
  /^event:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SubscribeSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(1000)
    .refine((u) => u.startsWith('https://'), 'Endpoint must be HTTPS.'),
  keys: z.object({
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(6).max(500),
  }),
  topics: z
    .array(
      z
        .string()
        .refine(
          (t) => ALLOWED_STATIC_TOPICS.has(t) || EVENT_TOPIC_RE.test(t),
          'Invalid topic'
        )
    )
    .min(1)
    .max(20)
    .default(['changes', 'urgent']),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const rl = await rateLimit(`push-sub:${ip}`, {
    limit: 10,
    windowSeconds: 3600,
    failMode: 'open',
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many alert changes. Try again in ${rl.retryAfter || 60}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid subscription.' },
      { status: 400 }
    );
  }

  const user = await getUser();
  try {
    const admin = createAdminClient();
    const { error } = await (
      admin as unknown as {
        from: (t: string) => {
          upsert: (
            row: Record<string, unknown>,
            opts: { onConflict: string }
          ) => Promise<{ error: { message?: string } | null }>;
        };
      }
    )
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          topics: parsed.data.topics,
          user_id: user?.id ?? null,
          failures: 0,
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      return NextResponse.json(
        { error: 'Alerts storage is not configured yet.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to save subscription right now.' },
      { status: 503 }
    );
  }
}
