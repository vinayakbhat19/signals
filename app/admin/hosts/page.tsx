'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Crown,
  MailPlus,
  Mic,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  event_id?: string | null;
  event_title?: string | null;
}

export default function AdminHostsPage() {
  const { feed } = useLiveFeed();
  const { isAdmin } = useAuth();
  const [eventId, setEventId] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [volEmail, setVolEmail] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'volunteer' | 'host' | 'organiser'>('host');
  const [staffEventId, setStaffEventId] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'organiser' | 'host' | 'volunteer'>('all');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [hosts, setHosts] = useState<
    Array<{ event_id: string; user_id: string; email: string | null; full_name: string | null }>
  >([]);
  const [pendingHosts, setPendingHosts] = useState<
    Array<{ id: string; event_id: string; email: string }>
  >([]);
  const [busy, setBusy] = useState(false);

  const staffApiUrl =
    process.env.NEXT_PUBLIC_STAFF_API ||
    'https://fiesta-staff.vinayak19v.workers.dev';

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const base = staffApiUrl.replace(/\/+$/, '').replace(/\/staff$/, '');

    let loadedViaWorker = false;

    // 1. Try loading via privileged Worker API
    if (token) {
      try {
        const res = await fetch(`${base}/staff/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            ok?: boolean;
            staff?: Array<{ id: string; full_name: string | null; email: string | null; role: string }>;
            event_hosts?: Array<{ event_id: string; user_id: string }>;
          };
          if (data.ok && Array.isArray(data.staff)) {
            const hostEventMap = new Map<string, string>();
            for (const eh of data.event_hosts || []) {
              hostEventMap.set(eh.user_id, eh.event_id);
            }

            const unified: StaffMember[] = data.staff.map((s) => {
              const evId = hostEventMap.get(s.id);
              const ev = feed.events.find((e) => e.id === evId);
              return {
                ...s,
                event_id: evId,
                event_title: ev?.title || null,
              };
            });

            setStaffList(unified);

            // Also populate hosts for event cards
            const hostsForCards: Array<{
              event_id: string;
              user_id: string;
              email: string | null;
              full_name: string | null;
            }> = [];
            for (const eh of data.event_hosts || []) {
              const matched = data.staff.find((st) => st.id === eh.user_id);
              hostsForCards.push({
                event_id: eh.event_id,
                user_id: eh.user_id,
                full_name: matched?.full_name || null,
                email: matched?.email || null,
              });
            }
            setHosts(hostsForCards);
            loadedViaWorker = true;
          }
        }
      } catch {
        // Fall back to client query below
      }
    }

    // 2. Client-side query fallback
    if (!loadedViaWorker) {
      const [hRes, invRes, vRes] = await Promise.all([
        supabase
          .from('event_hosts')
          .select('event_id, user_id, profiles(full_name, email)'),
        supabase
          .from('host_invites')
          .select('id, event_id, email')
          .is('accepted_at', null),
        supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['volunteer', 'organiser', 'host', 'admin']),
      ]);

      const hostList = ((hRes.data ?? []) as unknown as Array<{
        event_id: string;
        user_id: string;
        profiles?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null;
      }>).map((r) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          event_id: r.event_id,
          user_id: r.user_id,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
        };
      });

      setHosts(hostList);
      setPendingHosts((invRes.data ?? []) as typeof pendingHosts);

      const hostEvMap = new Map<string, string>();
      for (const h of hostList) {
        hostEvMap.set(h.user_id, h.event_id);
      }

      const profList = ((vRes.data ?? []) as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
        role: string;
      }>).map((p) => {
        const evId = hostEvMap.get(p.id);
        const ev = feed.events.find((e) => e.id === evId);
        return {
          ...p,
          event_id: evId,
          event_title: ev?.title || null,
        };
      });

      setStaffList(profList);
    }
  }, [feed.events, staffApiUrl]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(raf);
  }, [load]);

  async function inviteHost(e: React.FormEvent) {
    e.preventDefault();
    const targetEv = eventId || feed.events[0]?.id;
    if (!targetEv || !hostEmail.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('invite_host', {
      p_event: targetEv,
      p_email: hostEmail.trim().toLowerCase(),
    });
    setBusy(false);
    const res = data as { ok?: boolean; status?: string; message?: string } | null;
    if (error || !res?.ok) toast.error(res?.message || error?.message || 'Invite failed');
    else {
      setHostEmail('');
      toast.success(
        res.status === 'active'
          ? 'Host activated immediately!'
          : 'Invite saved! Ask them to sign in with that exact email.'
      );
      await load();
    }
  }

  async function inviteVolunteer(e: React.FormEvent) {
    e.preventDefault();
    if (!volEmail.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('invite_volunteer', {
      p_email: volEmail.trim().toLowerCase(),
    });
    setBusy(false);
    const res = data as { ok?: boolean; status?: string; message?: string } | null;
    if (error || !res?.ok) toast.error(res?.message || error?.message || 'Invite failed');
    else {
      setVolEmail('');
      toast.success(
        res.status === 'active'
          ? 'Volunteer activated!'
          : 'Volunteer invite saved!'
      );
      await load();
    }
  }

  async function createStaffViaWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!staffApiUrl) {
      toast.error('Staff account service is currently unavailable.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const base = staffApiUrl.replace(/\/+$/, '').replace(/\/staff$/, '');
      const res = await fetch(`${base}/staff/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: staffName.trim(),
          email: staffEmail.trim().toLowerCase(),
          password: staffPassword,
          role: staffRole,
          event_id:
            staffRole === 'host'
              ? staffEventId || feed.events[0]?.id
              : undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        reason?: string;
      };
      if (!res.ok || !json.ok) {
        toast.error(
          json.message || json.error || json.reason || 'Could not create staff account.'
        );
      } else {
        setStaffName('');
        setStaffEmail('');
        setStaffPassword('');
        toast.success(`Account created for ${staffRole.toUpperCase()}! They can log in now.`);
        await load();
      }
    } catch {
      toast.error('Could not reach the staff account service. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveStaff(userId: string, name: string) {
    if (!confirm(`Remove staff privileges for ${name}?`)) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const base = staffApiUrl.replace(/\/+$/, '').replace(/\/staff$/, '');
      const res = await fetch(`${base}/staff/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.message || 'Could not remove staff.');
      } else {
        toast.success('Staff access removed.');
        await load();
      }
    } catch {
      toast.error('Could not reach staff service.');
    } finally {
      setBusy(false);
    }
  }

  // Categorize staff
  const organisers = staffList.filter((s) => s.role === 'organiser');
  const eventHosts = staffList.filter((s) => s.role === 'host');
  const volunteers = staffList.filter((s) => s.role === 'volunteer');

  const filteredStaff =
    roleFilter === 'all'
      ? staffList.filter((s) => s.role !== 'admin')
      : staffList.filter((s) => s.role === roleFilter);

  return (
    <div className="space-y-6">
      {/* 1. Direct Staff Account Creation (Admin Form) */}
      {isAdmin && (
        <form
          onSubmit={createStaffViaWorker}
          className="rounded-[24px] border-[1.5px] border-[#FF4FD8]/60 bg-[#1F1230] p-5 space-y-4 shadow-[4px_4px_0_#FF4FD8]"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
              <UserPlus className="size-5 text-[#FF4FD8]" />
              Create Staff Account (Instant Access)
            </h2>
            <span className="rounded-full bg-[#FF4FD8]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FF4FD8]">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-[#BDB8CF] leading-relaxed">
            Create a ready-to-use login for an <strong>Organiser</strong>, <strong>Event Host</strong>, or <strong>Volunteer</strong>. Their account is confirmed immediately — no verification email required.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Full name"
              className="h-11 rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
            <input
              type="email"
              required
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="staff@gmail.com"
              className="h-11 rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
            <input
              type="password"
              required
              minLength={8}
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder="Password (8+ chars)"
              className="h-11 rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
            <select
              value={staffRole}
              onChange={(e) =>
                setStaffRole(e.target.value as 'volunteer' | 'host' | 'organiser')
              }
              className="h-11 rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs font-bold text-[#FFD60A] outline-none focus:border-[#FFD60A]"
            >
              <option value="host">Role: Event Host</option>
              <option value="organiser">Role: Organiser</option>
              <option value="volunteer">Role: Volunteer</option>
            </select>
            {staffRole === 'host' ? (
              <select
                value={staffEventId}
                onChange={(e) => setStaffEventId(e.target.value)}
                className="h-11 rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
              >
                <option value="">Select Event...</option>
                {feed.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-11 items-center rounded-[14px] border border-[#3B2758]/50 bg-[#12091E]/50 px-3.5 text-[11px] text-[#9C97B0]">
                All-access permissions
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-[14px] bg-[#FF4FD8] px-6 text-xs font-extrabold text-[#12091E] shadow-[3px_3px_0_#FFD60A] hover:bg-[#FF6FE0] cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="size-4" />
            Create &amp; Activate Staff Account
          </button>
        </form>
      )}

      {/* 2. Active Staff Directory (Organisers, Hosts & Volunteers) */}
      <section className="rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
              <Users className="size-5 text-[#FFD60A]" />
              Active Staff Directory
            </h2>
            <p className="text-xs text-[#BDB8CF] mt-0.5">
              {organisers.length} Organisers · {eventHosts.length} Event Hosts · {volunteers.length} Volunteers
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                roleFilter === 'all'
                  ? 'bg-[#FFD60A] text-[#12091E]'
                  : 'bg-[#12091E] text-[#BDB8CF] hover:text-[#F4F2FA]'
              }`}
            >
              All ({filteredStaff.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('organiser')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                roleFilter === 'organiser'
                  ? 'bg-[#FF4FD8] text-[#12091E]'
                  : 'bg-[#12091E] text-[#BDB8CF] hover:text-[#FF4FD8]'
              }`}
            >
              Organisers ({organisers.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('host')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                roleFilter === 'host'
                  ? 'bg-[#9B6CFF] text-[#12091E]'
                  : 'bg-[#12091E] text-[#BDB8CF] hover:text-[#9B6CFF]'
              }`}
            >
              Hosts ({eventHosts.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('volunteer')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                roleFilter === 'volunteer'
                  ? 'bg-[#22D3EE] text-[#12091E]'
                  : 'bg-[#12091E] text-[#BDB8CF] hover:text-[#22D3EE]'
              }`}
            >
              Volunteers ({volunteers.length})
            </button>
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3B2758] p-6 text-center text-xs text-[#9C97B0]">
            No staff members found under this filter. Create one above to add them immediately.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#3B2758] bg-[#12091E] p-3.5"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        member.role === 'organiser'
                          ? 'bg-[#FF4FD8]/20 text-[#FF4FD8] border border-[#FF4FD8]/40'
                          : member.role === 'host'
                          ? 'bg-[#9B6CFF]/20 text-[#9B6CFF] border border-[#9B6CFF]/40'
                          : 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                      }`}
                    >
                      {member.role === 'organiser' && <Crown className="size-2.5" />}
                      {member.role === 'host' && <Mic className="size-2.5" />}
                      {member.role === 'volunteer' && <UserCheck className="size-2.5" />}
                      {member.role}
                    </span>
                    {member.event_title && (
                      <span className="truncate text-[10px] font-semibold text-[#FFD60A]">
                        · {member.event_title}
                      </span>
                    )}
                  </div>
                  <strong className="block truncate text-sm font-bold text-[#F4F2FA]">
                    {member.full_name || member.email?.split('@')[0] || 'Staff'}
                  </strong>
                  <p className="truncate text-xs text-[#9C97B0]">
                    {member.email || 'No email registered'}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    title={`Remove ${member.full_name || member.email}`}
                    onClick={() =>
                      handleRemoveStaff(
                        member.id,
                        member.full_name || member.email || 'Staff'
                      )
                    }
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Quick Assign Existing User Forms */}
      <div className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={inviteHost}
          className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
        >
          <h3 className="flex items-center gap-2 font-heading text-base font-extrabold text-[#F4F2FA]">
            <Mic className="size-4 text-[#9B6CFF]" />
            Assign Host to Event (Existing User)
          </h3>
          <p className="text-xs text-[#9C97B0]">
            Attach an existing registered student account to host an event.
          </p>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="h-11 w-full rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none"
          >
            {feed.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <input
            type="email"
            required
            value={hostEmail}
            onChange={(e) => setHostEmail(e.target.value)}
            placeholder="host@gmail.com"
            className="h-11 w-full rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#9B6CFF] text-xs font-extrabold text-[#12091E] shadow-[3px_3px_0_#FFD60A] hover:bg-[#B38CFF] cursor-pointer"
          >
            <MailPlus className="size-4" />
            Assign Host
          </button>
        </form>

        <form
          onSubmit={inviteVolunteer}
          className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
        >
          <h3 className="flex items-center gap-2 font-heading text-base font-extrabold text-[#F4F2FA]">
            <UserCheck className="size-4 text-[#22D3EE]" />
            Promote to Volunteer (Existing User)
          </h3>
          <p className="text-xs text-[#9C97B0]">
            Grant stamp check-in and stage support rights to an existing user.
          </p>
          <input
            type="email"
            required
            value={volEmail}
            onChange={(e) => setVolEmail(e.target.value)}
            placeholder="volunteer@gmail.com"
            className="h-11 w-full rounded-[14px] border border-[#3B2758] bg-[#12091E] px-3.5 text-xs text-[#F4F2FA] outline-none"
          />
          <div className="h-11" />
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#22D3EE] text-xs font-extrabold text-[#12091E] shadow-[3px_3px_0_#FF4FD8] hover:bg-[#4FE0F5] cursor-pointer"
          >
            <MailPlus className="size-4" />
            Promote Volunteer
          </button>
        </form>
      </div>

      {/* 4. Event Hosts List By Event */}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-extrabold text-[#F4F2FA]">
          Event Hosts by Event (21 Events)
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {feed.events.map((ev) => {
            const evHosts = hosts.filter((h) => h.event_id === ev.id);
            const evInv = pendingHosts.filter((i) => i.event_id === ev.id);
            return (
              <div
                key={ev.id}
                className="rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <strong className="truncate text-sm text-[#F4F2FA]">
                    {ev.title}
                  </strong>
                  <Link
                    href={`/host/participants/?id=${ev.id}`}
                    className="text-[11px] font-bold text-[#FFD60A] hover:underline"
                  >
                    Participants →
                  </Link>
                </div>
                {evHosts.length === 0 && evInv.length === 0 ? (
                  <p className="text-xs italic text-[#9C97B0]">No host assigned yet</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {evHosts.map((h) => (
                      <div
                        key={h.user_id}
                        className="flex items-center justify-between rounded-xl bg-[#12091E] px-3 py-2"
                      >
                        <span className="font-medium text-[#F4F2FA]">
                          {h.full_name || h.email}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            const supabase = createClient();
                            await supabase
                              .from('event_hosts')
                              .delete()
                              .eq('event_id', ev.id)
                              .eq('user_id', h.user_id);
                            toast.success('Host assignment removed.');
                            await load();
                          }}
                          className="text-[#FF4F5E] cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {evInv.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-xl border border-dashed border-[#3B2758] px-3 py-2 text-[#BDB8CF]"
                      >
                        <span>{inv.email} (waiting for signup)</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const supabase = createClient();
                            await supabase
                              .from('host_invites')
                              .delete()
                              .eq('id', inv.id);
                            await load();
                          }}
                          className="text-[#FF4F5E] cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
