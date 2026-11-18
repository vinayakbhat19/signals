import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimit,
} from '@/lib/ratelimit';

const ResetSchema = z.object({
  email: z.string().trim().email().max(120),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter a valid email address.' },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const ip = getClientIp(request.headers);

  // RESILIENCE.md section 3: 3 per hour per email + IP, failMode: closed
  const rl = await rateLimit(`reset:${ip}:${email}`, {
    limit: 3,
    windowSeconds: 3600,
    failMode: 'closed',
  });

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Too many reset requests. Please try again in ${rl.retryAfter || 60} seconds.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfter || 60),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset/new`,
    });
  } catch {
    // Deliberately swallow to avoid revealing account existence
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        'If an account exists for that email, we sent a password reset link.',
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
