import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimit,
} from '@/lib/ratelimit';

const SignupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(200)
    .regex(/\d/, 'Password must include at least one number.'),
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

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Check your details and try again.' },
      { status: 400 }
    );
  }

  const ip = getClientIp(request.headers);

  // RESILIENCE.md section 3: Sign-up 5 per 10 min per IP, failMode: closed
  const rl = await rateLimit(`signup:${ip}`, {
    limit: 5,
    windowSeconds: 600,
    failMode: 'closed',
  });

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Too many sign-up attempts. Please try again in ${rl.retryAfter || 60} seconds.`,
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

  const email = parsed.data.email.toLowerCase();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/verified`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: 'Unable to create account right now. Please try again.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { ok: true, signedIn: Boolean(data.session) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Sign-up is busy right now. Please try again shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
