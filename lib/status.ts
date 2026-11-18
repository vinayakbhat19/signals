import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { createPublicClient } from '@/lib/supabase/public';
import { readWithFallback } from '@/lib/resilience';
import {
  DEFAULT_APP_STATUS,
  type AppMode,
  type AppStatus,
} from '@/lib/modes';

export const CAMPUS_PREVIEW_COOKIE = 'fiesta_campus_preview';

function getPreviewSigningKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EMERGENCY_PIN_HASH ||
    'fiesta26-preview-fallback-secret'
  );
}

export function signCampusPreviewToken(userId: string): string {
  const sig = crypto
    .createHmac('sha256', getPreviewSigningKey())
    .update(`campus_preview:${userId}`)
    .digest('hex');
  return `${userId}.${sig}`;
}

export function verifyCampusPreviewToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  const expected = crypto
    .createHmac('sha256', getPreviewSigningKey())
    .update(`campus_preview:${userId}`)
    .digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    return crypto.timingSafeEqual(a, b) ? userId : null;
  } catch {
    return null;
  }
}

export async function getPublicAppStatus(): Promise<{
  status: AppStatus;
  source: 'db' | 'cache' | 'fallback';
}> {
  const res = await readWithFallback<AppStatus>(
    'app_status',
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await (
        supabase as unknown as {
          rpc: (
            fn: string
          ) => Promise<{
            data: Partial<AppStatus> | null;
            error: { code?: string; message?: string } | null;
          }>;
        }
      ).rpc('app_status');

      if (error || !data) {
        if (error?.code === '42883' || error?.code === 'PGRST202') {
          // schema_ops.sql not applied yet — default to fest mode cleanly
          return {
            ...DEFAULT_APP_STATUS,
            server_time: new Date().toISOString(),
          };
        }
        throw new Error(error?.message || 'app_status RPC failed');
      }

      return {
        mode: (data.mode === 'campus' ? 'campus' : 'fest') as AppMode,
        fest_name: data.fest_name || DEFAULT_APP_STATUS.fest_name,
        fest_starts_at: data.fest_starts_at || DEFAULT_APP_STATUS.fest_starts_at,
        fest_ends_at: data.fest_ends_at || DEFAULT_APP_STATUS.fest_ends_at,
        campus_from: data.campus_from || DEFAULT_APP_STATUS.campus_from,
        writes_paused: Boolean(data.writes_paused),
        banner: data.banner ?? null,
        banner_level:
          data.banner_level === 'warning' || data.banner_level === 'critical'
            ? data.banner_level
            : 'info',
        server_time: data.server_time || new Date().toISOString(),
        is_preview: false,
      };
    },
    {
      ...DEFAULT_APP_STATUS,
      server_time: new Date().toISOString(),
    }
  );

  return { status: res.data, source: res.source };
}

/**
 * Dynamic variant that also respects the organiser-only signed preview cookie.
 * Do NOT call inside static/ISR pages (use getPublicAppStatus there).
 */
export async function getAppStatusWithPreview(): Promise<AppStatus> {
  const { status } = await getPublicAppStatus();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CAMPUS_PREVIEW_COOKIE)?.value;
    if (verifyCampusPreviewToken(token)) {
      return { ...status, mode: 'campus', is_preview: true };
    }
  } catch {
    // Ignore when called outside dynamic request context
  }
  return status;
}
