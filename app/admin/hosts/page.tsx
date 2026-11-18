import { requireOrganiser } from '@/lib/auth';
import {
  AdminHostsClient,
  type HostEventRow,
} from '@/components/admin-hosts-client';
import { listEvents } from '@/lib/data/events';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminHostsPage() {
  await requireOrganiser();

  const events = await listEvents();
  const admin = createAdminClient();

  let hostsUntil = '2026-11-30T23:59:59+05:30';
  const hostsByEvent = new Map<
    string,
    Array<{ user_id: string; full_name: string | null; email: string | null }>
  >();
  const invitesByEvent = new Map<
    string,
    Array<{ id: string; email: string; created_at: string }>
  >();

  try {
    const [hostsRes, invitesRes, cfgRes] = await Promise.all([
      admin
        .from('event_hosts')
        .select('event_id, user_id, profiles(full_name, email)'),
      (
        admin as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              is: (k: string, v: null) => Promise<{
                data: Array<{
                  id: string;
                  event_id: string;
                  email: string;
                  created_at: string;
                }> | null;
              }>;
            };
          };
        }
      )
        .from('host_invites')
        .select('id, event_id, email, created_at')
        .is('accepted_at', null),
      (
        admin as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (k: string, v: number) => {
                maybeSingle: () => Promise<{
                  data: { hosts_until?: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from('app_config')
        .select('hosts_until')
        .eq('id', 1)
        .maybeSingle(),
    ]);

    if (cfgRes.data?.hosts_until) hostsUntil = cfgRes.data.hosts_until;

    for (const row of (hostsRes.data ?? []) as unknown as Array<{
      event_id: string;
      user_id: string;
      profiles?:
        | { full_name: string | null; email: string | null }
        | Array<{ full_name: string | null; email: string | null }>
        | null;
    }>) {
      const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const list = hostsByEvent.get(row.event_id) ?? [];
      list.push({
        user_id: row.user_id,
        full_name: prof?.full_name ?? null,
        email: prof?.email ?? null,
      });
      hostsByEvent.set(row.event_id, list);
    }

    for (const inv of invitesRes.data ?? []) {
      const list = invitesByEvent.get(inv.event_id) ?? [];
      list.push({ id: inv.id, email: inv.email, created_at: inv.created_at });
      invitesByEvent.set(inv.event_id, list);
    }
  } catch {
    // Graceful degradation if tables not yet created
  }

  const rows: HostEventRow[] = events.map((ev) => ({
    id: ev.id,
    code: ev.code,
    title: ev.title,
    hosts: hostsByEvent.get(ev.id) ?? [],
    pendingInvites: invitesByEvent.get(ev.id) ?? [],
  }));

  let volunteers: Array<{ id: string; full_name: string | null; email: string | null }> = [];
  let pendingVolunteers: Array<{ email: string; created_at: string }> = [];

  try {
    const [volRes, staffInvRes] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'volunteer'),
      (
        admin as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              is: (k: string, v: null) => Promise<{
                data: Array<{ email: string; created_at: string }> | null;
              }>;
            };
          };
        }
      )
        .from('staff_invites')
        .select('email, created_at')
        .is('accepted_at', null),
    ]);
    volunteers = volRes.data ?? [];
    pendingVolunteers = staffInvRes.data ?? [];
  } catch {
    // Graceful if staff_invites not yet applied
  }

  return (
    <AdminHostsClient
      events={rows}
      hostsUntil={hostsUntil}
      volunteers={volunteers}
      pendingVolunteers={pendingVolunteers}
    />
  );
}
