'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Copy, MailPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelHostInviteAction,
  inviteHostAction,
  removeHostAction,
} from '@/app/admin/hosts/actions';

export interface HostEventRow {
  id: string;
  code: string | null;
  title: string;
  hosts: Array<{
    user_id: string;
    full_name: string | null;
    email: string | null;
  }>;
  pendingInvites: Array<{
    id: string;
    email: string;
    created_at: string;
  }>;
}

export function AdminHostsClient({
  events,
  hostsUntil,
}: {
  events: HostEventRow[];
  hostsUntil: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [lastShareLink, setLastShareLink] = useState<string | null>(null);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !email.trim()) return;
    startTransition(async () => {
      const res = await inviteHostAction(eventId, email.trim());
      if (!res.ok) {
        toast.error(res.error);
      } else {
        setEmail('');
        setLastShareLink(res.shareUrl);
        toast.success(
          res.status === 'active'
            ? 'Host added immediately (confirmed account found)!'
            : 'Invite saved! Share the host sign-in link with them.'
        );
      }
    });
  }

  function handleRemoveHost(evId: string, userId: string) {
    startTransition(async () => {
      const res = await removeHostAction(evId, userId);
      if (!res.ok) toast.error(res.error);
      else toast.success('Host access removed immediately.');
    });
  }

  function handleCancelInvite(inviteId: string) {
    startTransition(async () => {
      const res = await cancelHostInviteAction(inviteId);
      if (!res.ok) toast.error(res.error);
      else toast.success('Pending invite cancelled.');
    });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Host sign-in link copied!');
    } catch {
      toast.info(url);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[#F4F2FA]">MANAGE HOSTS</h1>
          <p className="text-xs text-[#9C97B0]">
            Invite competition coordinators by email. Host access activates only
            after email confirmation and ends{' '}
            <strong className="text-[#FFD60A]">
              {new Date(hostsUntil).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              IST
            </strong>
            .
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <form
        onSubmit={handleInvite}
        className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <MailPlus className="size-5 text-[#FFD60A]" />
          Invite a Host
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            required
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.code ? `${ev.code} · ` : ''}
                {ev.title}
              </option>
            ))}
          </select>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coordinator@sdmcet.ac.in"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
          />
          <button
            type="submit"
            disabled={isPending || !eventId}
            className="h-11 rounded-xl bg-[#FFD60A] px-4 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Saving…' : 'Send Invite'}
          </button>
        </div>

        {lastShareLink && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FFD60A]/40 bg-[#12091E] px-3.5 py-2.5 text-xs">
            <span className="text-[#CFCBDD]">
              Tell them: <strong>Sign in with THIS exact email address</strong>{' '}
              at <code>{lastShareLink}</code>
            </span>
            <button
              type="button"
              onClick={() => void copyLink(lastShareLink)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#FFD60A] px-2.5 py-1 font-extrabold text-[#12091E] cursor-pointer"
            >
              <Copy className="size-3" />
              Copy link
            </button>
          </div>
        )}
      </form>

      {/* Event Host Table */}
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-extrabold text-[#F4F2FA]">
                  {ev.code ? `${ev.code} · ` : ''}
                  {ev.title}
                </p>
              </div>
              <Link
                href={`/host/events/${ev.id}/participants`}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#3B2758] px-2.5 py-1 text-[11px] font-bold text-[#FFD60A] hover:border-[#FFD60A]"
              >
                <Users className="size-3" />
                Participants
              </Link>
            </div>

            {ev.hosts.length === 0 && ev.pendingInvites.length === 0 ? (
              <p className="text-xs italic text-[#9C97B0]">No host yet</p>
            ) : (
              <div className="space-y-1.5">
                {ev.hosts.map((h) => (
                  <div
                    key={h.user_id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#12091E] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-[#F4F2FA]">
                        {h.full_name || h.email || 'Host'}
                      </span>
                      {h.email && (
                        <span className="ml-1.5 text-[#9C97B0]">{h.email}</span>
                      )}
                      <span className="ml-2 rounded-full bg-[#FFD60A]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#FFD60A]">
                        ACTIVE
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemoveHost(ev.id, h.user_id)}
                      aria-label="Remove host"
                      className="text-[#FF4F5E] hover:opacity-80 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}

                {ev.pendingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#3B2758] bg-[#12091E]/60 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[#CFCBDD]">{inv.email}</span>
                      <span className="ml-2 rounded-full bg-[#FFE14D]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#FFE14D]">
                        WAITING
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancelInvite(inv.id)}
                      aria-label="Cancel invite"
                      className="text-[#9C97B0] hover:text-[#FF4F5E] cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
