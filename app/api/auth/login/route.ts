import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimit,
} from '@/lib/ratelimit';

const LoginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(200),
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

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const ip = getClientIp(request.headers);

  // RESILIENCE.md section 3: 10 per 10 min per IP + email
  const rl = await rateLimit(`login:${ip}:${email}`, {
    limit: 10,
    windowSeconds: 600,
    failMode: 'open',
  });

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Too many sign-in tries. Please wait ${rl.retryAfter || 60} seconds and try again.`,
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

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (error) {
      // Never reveal whether the email exists
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Sign-in is busy right now. Please try again shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
