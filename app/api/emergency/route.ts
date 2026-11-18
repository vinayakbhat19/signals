import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getClientIp,
  isSameOriginRequest,
  rateLimit,
} from '@/lib/ratelimit';
import { readEmergencyOverlay, writeEmergencyOverlay } from '@/lib/snapshot';

const EMERGENCY_COOKIE = 'fiesta_emergency_session';

function getEmergencySecret(): string {
  return process.env.EMERGENCY_PIN_HASH || '';
}

function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash) return false;
  // Support scrypt format "salt:hex" or sha256 hex digest
  if (storedHash.includes(':')) {
    const [salt, expectedHex] = storedHash.split(':');
    const derived = crypto.scryptSync(pin, salt, 32).toString('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(derived, 'hex'),
        Buffer.from(expectedHex, 'hex')
      );
    } catch {
      return false;
    }
  }
  const sha = crypto.createHash('sha256').update(pin).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sha, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

function signSession(): string {
  const secret = getEmergencySecret();
  const exp = Date.now() + 2 * 60 * 60 * 1000;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`emerg:${exp}`)
    .digest('hex');
  return `${exp}.${sig}`;
}

function verifySession(token: string | undefined): boolean {
  const secret = getEmergencySecret();
  if (!secret || !token) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`emerg:${exp}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth'), pin: z.string().min(4).max(32) }),
  z.object({
    type: z.literal('announcement'),
    message: z.string().trim().min(2).max(280),
    priority: z.enum(['normal', 'urgent']).default('urgent'),
  }),
  z.object({
    type: z.literal('event_status'),
    eventId: z.string().min(1).max(80),
    status: z.enum(['scheduled', 'delayed', 'cancelled']),
  }),
  z.object({ type: z.literal('clear') }),
]);

export async function GET() {
  const cookieStore = await cookies();
  const authed = verifySession(cookieStore.get(EMERGENCY_COOKIE)?.value);
  return NextResponse.json(
    {
      configured: Boolean(getEmergencySecret()),
      authenticated: authed,
      overlay: authed ? readEmergencyOverlay() : null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

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

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const secret = getEmergencySecret();
  if (!secret) {
    return NextResponse.json(
      { error: 'EMERGENCY_PIN_HASH is not configured in environment.' },
      { status: 503 }
    );
  }

  if (parsed.data.type === 'auth') {
    const ip = getClientIp(request.headers);
    const rl = await rateLimit(`emergency-pin:${ip}`, {
      limit: 5,
      windowSeconds: 900,
      failMode: 'open',
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many PIN attempts. Wait ${rl.retryAfter || 60}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    if (!verifyPin(parsed.data.pin, secret)) {
      return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(EMERGENCY_COOKIE, signSession(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60,
      path: '/',
    });
    return res;
  }

  const cookieStore = await cookies();
  if (!verifySession(cookieStore.get(EMERGENCY_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const overlay = readEmergencyOverlay();
  const nowIso = new Date().toISOString();

  if (parsed.data.type === 'announcement') {
    overlay.announcements.unshift({
      id: `emerg-${crypto.randomUUID()}`,
      message: parsed.data.message,
      event_id: null,
      priority: parsed.data.priority,
      created_by: null,
      created_at: nowIso,
    });
    overlay.announcements = overlay.announcements.slice(0, 10);
    overlay.log.unshift({
      at: nowIso,
      action: 'announcement',
      detail: `[${parsed.data.priority}] ${parsed.data.message}`,
    });
  } else if (parsed.data.type === 'event_status') {
    overlay.eventOverrides[parsed.data.eventId] = {
      status: parsed.data.status,
    };
    overlay.log.unshift({
      at: nowIso,
      action: 'event_status',
      detail: `${parsed.data.eventId} -> ${parsed.data.status}`,
    });
  } else if (parsed.data.type === 'clear') {
    overlay.announcements = [];
    overlay.eventOverrides = {};
    overlay.log.unshift({
      at: nowIso,
      action: 'clear',
      detail: 'Cleared emergency overlay',
    });
  }

  overlay.updatedAt = nowIso;
  overlay.log = overlay.log.slice(0, 50);
  writeEmergencyOverlay(overlay);

  return NextResponse.json(
    { ok: true, overlay },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
