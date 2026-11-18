import { cookies } from 'next/headers';
import { requireOrganiser } from '@/lib/auth';
import { AdminSafetyClient, type AuditRow } from '@/components/admin-safety-client';
import { getLastRateLimitSource } from '@/lib/ratelimit';
import { getSnapshotAgeSeconds } from '@/lib/snapshot';
import {
  CAMPUS_PREVIEW_COOKIE,
  getPublicAppStatus,
  verifyCampusPreviewToken,
} from '@/lib/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

async function pingDatabase(): Promise<{
  db: 'ok' | 'down';
  dbLatencyMs: number | null;
}> {
  try {
    const start = Date.now();
    const pub = createPublicClient();
    const { error } = await pub.from('venues').select('id').limit(1);
    if (!error) {
      return { db: 'ok', dbLatencyMs: Date.now() - start };
    }
  } catch {
    // ignore
  }
  return { db: 'down', dbLatencyMs: null };
}

export default async function AdminSafetyPage() {
  await requireOrganiser();

  const { db, dbLatencyMs } = await pingDatabase();
  let auth: 'ok' | 'down' = 'down';

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        signal: AbortSignal.timeout(2000),
        cache: 'no-store',
      });
      if (r.ok) auth = 'ok';
    }
  } catch {
    auth = 'down';
  }

  const { status } = await getPublicAppStatus();
  let opsSchemaReady = false;
  let modeOverride: 'auto' | 'fest' | 'campus' = 'auto';
  let hostsUntil = '2026-11-30T23:59:59+05:30';
  let pushQueueCount = 0;
  let pushDeviceCount = 0;
  let auditLogs: AuditRow[] = [];

  try {
    const admin = createAdminClient();
    const untyped = admin as unknown as {
      from: (t: string) => {
        select: (c: string, opts?: Record<string, unknown>) => {
          eq?: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }> };
          is?: (k: string, v: null) => Promise<{ count: number | null }>;
          order?: (k: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: AuditRow[] | null }>;
          };
        } & Promise<{ count: number | null }>;
      };
    };

    const cfgRes = await untyped
      .from('app_config')
      .select('mode_override, hosts_until')
      .eq!('id', 1)
      .maybeSingle();

    if (!cfgRes.error && cfgRes.data) {
      opsSchemaReady = true;
      const mo = cfgRes.data.mode_override;
      if (mo === 'auto' || mo === 'fest' || mo === 'campus') modeOverride = mo;
      if (typeof cfgRes.data.hosts_until === 'string') {
        hostsUntil = cfgRes.data.hosts_until;
      }

      const [qRes, dRes, logRes] = await Promise.all([
        untyped.from('push_queue').select('id', { count: 'exact', head: true }).is!('sent_at', null),
        untyped.from('push_subscriptions').select('id', { count: 'exact', head: true }),
        untyped
          .from('audit_log')
          .select('id, at, action, target, detail')
          .order!('at', { ascending: false })
          .limit(10),
      ]);
      pushQueueCount = qRes.count ?? 0;
      pushDeviceCount = dRes.count ?? 0;
      auditLogs = logRes.data ?? [];
    }
  } catch {
    opsSchemaReady = false;
  }

  const cookieStore = await cookies();
  const isCampusPreview = Boolean(
    verifyCampusPreviewToken(cookieStore.get(CAMPUS_PREVIEW_COOKIE)?.value)
  );

  return (
    <AdminSafetyClient
      health={{
        db,
        dbLatencyMs,
        auth,
        snapshotAgeS: getSnapshotAgeSeconds(),
        limiter: getLastRateLimitSource(),
        pushQueueCount,
        pushDeviceCount,
      }}
      config={{
        mode: status.mode,
        mode_override: modeOverride,
        writes_paused: status.writes_paused,
        banner_message: status.banner ?? '',
        banner_level: status.banner_level,
        campus_from: status.campus_from,
        hosts_until: hostsUntil,
      }}
      isCampusPreview={isCampusPreview}
      auditLogs={auditLogs}
      opsSchemaReady={opsSchemaReady}
    />
  );
}
