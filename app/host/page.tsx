'use client';

import Link from 'next/link';
import { CalendarCog, Loader2, QrCode, ShieldAlert, Users } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { useAuth } from '@/lib/use-auth';

export default function HostHomePage() {
  const { loading, isHost, isOrganiser, hostedEventIds } = useAuth();
  const { feed } = useLiveFeed();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">NOT ALLOWED</h1>
        <p className="text-sm text-[#9C97B0]">
          You do not have active host access. Ask an organiser to invite your
          email.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const hostedSet = new Set(hostedEventIds);
  const myEvents = isOrganiser
    ? feed.events
    : feed.events.filter((e) => hostedSet.has(e.id));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[#F4F2FA]">
            MY HOSTED EVENTS
          </h1>
          <p className="text-xs text-[#9C97B0]">
            Update time/venue/registration window, check line-up, and
            manage participants.
          </p>
        </div>
        <Link
          href="/staff/stickers/"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
        >
          <QrCode className="size-4" />
          Hunt QR Stickers
        </Link>
      </header>

      <div className="space-y-3">
        {myEvents.map((ev) => (
          <div
            key={ev.id}
            className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3"
          >
            <div>
              <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                {ev.code ? `${ev.code} · ` : ''}
                {ev.title}
              </p>
              <p className="text-xs text-[#9C97B0]">
                {ev.venue_name || 'Venue TBA'} · Status: {ev.status}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/host/event/?id=${ev.id}`}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FFD60A] text-xs font-extrabold text-[#12091E]"
              >
                <CalendarCog className="size-3.5" />
                Edit Event
              </Link>
              <Link
                href={`/host/participants/?id=${ev.id}`}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] text-xs font-bold text-[#F4F2FA]"
              >
                <Users className="size-3.5 text-[#22D3EE]" />
                Line-up
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
