'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MailPlus, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

export default function AdminHostsPage() {
  const { feed } = useLiveFeed();
  const { isAdmin } = useAuth();
  const [eventId, setEventId] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [volEmail, setVolEmail] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'volunteer' | 'host'>('volunteer');
  const [staffEventId, setStaffEventId] = useState('');

  const [hosts, setHosts] = useState<
    Array<{ event_id: string; user_id: string; email: string | null; full_name: string | null }>
  >([]);
  const [pendingHosts, setPendingHosts] = useState<
    Array<{ id: string; event_id: string; email: string }>
  >([]);
  const [volunteers, setVolunteers] = useState<
    Array<{ id: string; email: string | null; full_name: string | null }>
  >([]);
  const [busy, setBusy] = useState(false);

  const staffApiUrl = process.env.NEXT_PUBLIC_STAFF_API || '';

  const load = useCallback(async () => {
    const supabase = createClient();
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
        .select('id, full_name, email')
        .eq('role', 'volunteer'),
    ]);

    setHosts(
      ((hRes.data ?? []) as unknown as Array<{
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
      })
    );
    setPendingHosts((invRes.data ?? []) as typeof pendingHosts);
    setVolunteers((vRes.data ?? []) as typeof volunteers);
  }, []);

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
      toast.error('Deploy workers/staff and set NEXT_PUBLIC_STAFF_API first.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${staffApiUrl.replace(/\/$/, '')}/create`, {
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
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error || 'Could not create staff account.');
      } else {
        setStaffName('');
        setStaffEmail('');
        setStaffPassword('');
        toast.success('Staff account created & confirmed!');
        await load();
      }
    } catch {
      toast.error('Could not reach Staff Worker.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Direct Staff Account Creation (Admin + Cloudflare Staff Worker) */}
      {isAdmin && (
        <form
          onSubmit={createStaffViaWorker}
          className="rounded-[22px] border border-[#FF4FD8]/50 bg-[#1F1230] p-5 space-y-3"
        >
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <UserPlus className="size-5 text-[#FF4FD8]" />
            Create Staff Account Directly (Cloudflare Staff Worker)
          </h2>
          <p className="text-xs text-[#9C97B0]">
            {staffApiUrl
              ? `Connected to ${staffApiUrl}`
              : 'Deploy workers/staff/ and set NEXT_PUBLIC_STAFF_API to create accounts with email + password in one step.'}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Full name"
              className="h-10 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            />
            <input
              type="email"
              required
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="staff@gmail.com"
              className="h-10 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            />
            <input
              type="password"
              required
              minLength={10}
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder="Password (10+ chars)"
              className="h-10 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            />
            <select
              value={staffRole}
              onChange={(e) =>
                setStaffRole(e.target.value as 'volunteer' | 'host')
              }
              className="h-10 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            >
              <option value="volunteer">Volunteer</option>
              <option value="host">Event Host</option>
            </select>
            <button
              type="submit"
              disabled={busy || !staffApiUrl}
              className="h-10 rounded-xl bg-[#FF4FD8] text-xs font-extrabold text-[#12091E] disabled:opacity-40 cursor-pointer"
            >
              Create Account
            </button>
          </div>
          {staffRole === 'host' && (
            <select
              value={staffEventId || feed.events[0]?.id || ''}
              onChange={(e) => setStaffEventId(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            >
              {feed.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  Event: {ev.title}
                </option>
              ))}
            </select>
          )}
        </form>
      )}

      {/* Invite Host by Email */}
      <form
        onSubmit={inviteHost}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <MailPlus className="size-5 text-[#FFD60A]" />
          Invite Event Host by Email
        </h2>
        <div className="grid gap-2.5 md:grid-cols-3">
          <select
            value={eventId || feed.events[0]?.id || ''}
            onChange={(e) => setEventId(e.target.value)}
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
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
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-[#FFD60A] text-sm font-extrabold text-[#12091E] cursor-pointer"
          >
            Invite Host
          </button>
        </div>
      </form>

      {/* Invite Volunteer by Email */}
      <form
        onSubmit={inviteVolunteer}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <Users className="size-5 text-[#22D3EE]" />
          Volunteers ({volunteers.length})
        </h2>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={volEmail}
            onChange={(e) => setVolEmail(e.target.value)}
            placeholder="volunteer@gmail.com"
            className="h-11 flex-1 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-[#22D3EE] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Invite Volunteer
          </button>
        </div>
        {volunteers.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {volunteers.map((v) => (
              <div
                key={v.id}
                className="flex justify-between rounded-xl bg-[#12091E] px-3 py-2 text-xs"
              >
                <span className="font-bold">{v.full_name || v.email}</span>
                <span className="text-[#22D3EE]">VOLUNTEER</span>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Event Hosts List */}
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
                  className="text-[11px] font-bold text-[#FFD60A]"
                >
                  Participants →
                </Link>
              </div>
              {evHosts.length === 0 && evInv.length === 0 ? (
                <p className="text-xs italic text-[#9C97B0]">No host yet</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {evHosts.map((h) => (
                    <div
                      key={h.user_id}
                      className="flex items-center justify-between rounded-xl bg-[#12091E] px-3 py-2"
                    >
                      <span>{h.full_name || h.email}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase
                            .from('event_hosts')
                            .delete()
                            .eq('event_id', ev.id)
                            .eq('user_id', h.user_id);
                          toast.success('Host removed.');
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
                      <span>{inv.email} (waiting)</span>
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
    </div>
  );
}
