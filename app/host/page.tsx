import Link from 'next/link';
import { CalendarCog, QrCode, Users } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HostHubPage() {
  const profile = await requireRole('host');
  const supabase = await createClient();

  const isOrg = profile.role === 'organiser' || profile.role === 'admin';
  let eventIds: string[] = [];

  if (isOrg) {
    const { data } = await supabase.from('events').select('id');
    eventIds = (data ?? []).map((e) => e.id);
  } else {
    const { data } = await supabase
      .from('event_hosts')
      .select('event_id')
      .eq('user_id', profile.id);
    eventIds = (data ?? []).map((r) => r.event_id);
  }

  const { data: events } =
    eventIds.length > 0
      ? await supabase
          .from('events')
          .select('id, code, title, starts_at')
          .in('id', eventIds)
          .order('starts_at', { ascending: true })
      : { data: [] };

  const { data: participantRows } =
    eventIds.length > 0
      ? await supabase
          .from('participants')
          .select('event_id, status')
          .in('event_id', eventIds)
      : { data: [] };

  const counts = new Map<string, { total: number; checkedIn: number }>();
  for (const p of participantRows ?? []) {
    const c = counts.get(p.event_id) ?? { total: 0, checkedIn: 0 };
    c.total += 1;
    if (
      p.status === 'checked_in' ||
      p.status === 'on_stage' ||
      p.status === 'performed'
    ) {
      c.checkedIn += 1;
    }
    counts.set(p.event_id, c);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl text-[#F4F2FA]">
            MY HOSTED EVENTS
          </h1>
          <p className="text-xs text-[#9C97B0]">
            Update your event time, venue, registration window, and manage
            participants.
          </p>
        </div>
        <Link
          href="/staff/stickers"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
        >
          <QrCode className="size-4" />
          Hunt QR Stickers
        </Link>
      </header>

      <div className="space-y-3">
        {(events ?? []).map((ev) => {
          const stat = counts.get(ev.id) ?? { total: 0, checkedIn: 0 };
          return (
            <div
              key={ev.id}
              className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3"
            >
              <div className="space-y-1">
                <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                  {ev.code ? `${ev.code} · ` : ''}
                  {ev.title}
                </p>
                <p className="flex items-center gap-2 text-xs text-[#BDB8CF]">
                  <Users className="size-3.5 text-[#FFD60A]" />
                  <span>{stat.total} registered</span>
                  <span>·</span>
                  <span className="text-[#FFD60A]">
                    {stat.checkedIn} checked in
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/host/events/${ev.id}`}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FFD60A] text-xs font-extrabold text-[#12091E]"
                >
                  <CalendarCog className="size-4" />
                  Edit Event &amp; Window
                </Link>
                <Link
                  href={`/host/events/${ev.id}/participants`}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] text-xs font-bold text-[#F4F2FA] hover:border-[#FFD60A]"
                >
                  <Users className="size-4 text-[#22D3EE]" />
                  Participants ({stat.total})
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
