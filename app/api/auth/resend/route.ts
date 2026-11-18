import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSameOriginRequest, rateLimit } from '@/lib/ratelimit';

const ResendSchema = z.object({
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

  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter a valid email address.' },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  // RESILIENCE.md section 3: 1 per 60 s per email
  const rl = await rateLimit(`resend:${email}`, {
    limit: 1,
    windowSeconds: 60,
    failMode: 'open',
  });

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Please wait ${rl.retryAfter || 60} seconds before requesting another email.`,
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
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/verified` },
    });
  } catch {
    // Avoid disclosing email existence
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
