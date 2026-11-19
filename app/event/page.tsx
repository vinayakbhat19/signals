'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Share2,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { CategoryChip } from '@/components/category-chip';
import { EventCover } from '@/components/event-cover';
import { EventShareModal } from '@/components/event-share-modal';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import {
  formatDay,
  formatRange,
  formatTime,
  isLive,
  isUpNext,
  toGoogleCalendarUtc,
} from '@/lib/time';
import type { Result } from '@/lib/types';
import { cn } from '@/lib/utils';

const OFFICIAL_REGISTRATION_HUB = 'https://linktr.ee/sdmcetFiesta26';

function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function EventDetailInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { feed } = useLiveFeed();
  const [extra, setExtra] = useState<{
    description?: string | null;
    contact_info?: string | null;
    host_coordinator?: string | null;
    results: Result[];
  }>({ results: [] });
  const [isShareOpen, setIsShareOpen] = useState(false);

  const event = feed.events.find((e) => e.id === id) ?? null;
  const venue = event?.venue_id
    ? feed.venues.find((v) => v.id === event.venue_id) ?? null
    : null;

  useEffect(() => {
    if (!id) return;
    let active = true;
    const supabase = createClient();
    Promise.all([
      supabase
        .from('events')
        .select('description, contact_info, host_coordinator')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('results')
        .select('id, event_id, title, body, is_live, updated_at')
        .eq('event_id', id)
        .order('updated_at', { ascending: false }),
    ])
      .then(([evRes, rRes]) => {
        if (!active) return;
        setExtra({
          description: evRes.data?.description ?? null,
          contact_info: evRes.data?.contact_info ?? null,
          host_coordinator: evRes.data?.host_coordinator ?? null,
          results: (rRes.data ?? []) as Result[],
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  if (!id || !event) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <h1 className="font-display text-2xl text-[#F4F2FA]">EVENT NOT FOUND</h1>
        <p className="text-sm text-[#9C97B0]">
          This event link may be outdated or loading.
        </p>
        <Link
          href="/events/"
          className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
        >
          Back to all events
        </Link>
      </div>
    );
  }

  const now = new Date(feed.server_time);
  const live = isLive(event, now);
  const soon = isUpNext(event, now);
  const isCancelled = event.status === 'cancelled';

  const regOpensAt = event.registration_opens_at
    ? new Date(event.registration_opens_at)
    : null;
  const regClosesAt = event.registration_closes_at
    ? new Date(event.registration_closes_at)
    : null;
  const regNotOpen = Boolean(regOpensAt && now < regOpensAt);
  const regClosed = Boolean(regClosesAt && now > regClosesAt);

  const dayStr = formatDay(event.starts_at);
  const rangeStr = formatRange(event.starts_at, event.ends_at);
  const festName = feed.status.fest_name || "Fiesta'26";

  const gcalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.title} (${festName})`,
    dates: `${toGoogleCalendarUtc(event.starts_at)}/${toGoogleCalendarUtc(event.ends_at)}`,
    details: extra.description ?? `${event.title} at ${festName}`,
    location: venue?.name ?? event.venue_name ?? '',
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;

  const hostName =
    event.host_name || extra.contact_info || "Fiesta'26 Committee";
  const directionsExternal = isSafeHttpUrl(venue?.maps_url);

  return (
    <div className="pb-6">
      <div className="relative overflow-hidden lg:mt-4 lg:rounded-[24px]">
        <EventCover
          title={event.title}
          category={event.category}
          coverUrl={event.cover_url}
          variant="hero"
        />
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between">
          <Link
            href="/events/"
            aria-label="Back to events"
            className="flex size-11 items-center justify-center rounded-[14px] bg-[#12091E]/90 text-[#F4F2FA]"
          >
            <ArrowLeft className="size-5 stroke-[2.5]" />
          </Link>
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            aria-label="Share event card"
            className="flex size-11 items-center justify-center rounded-[14px] bg-[#12091E]/90 text-[#F4F2FA] hover:bg-[#FFD60A] hover:text-[#12091E] active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      <div className="relative -mt-6 space-y-3.5 rounded-t-[24px] bg-[#12091E] px-4 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4FD8] px-2.5 py-1 text-[11px] font-extrabold text-[#12091E]">
              LIVE NOW
            </span>
          )}
          {!live && soon && (
            <span className="rounded-full bg-[#FFE14D] px-2.5 py-1 text-[11px] font-extrabold text-[#12091E]">
              COMING SOON
            </span>
          )}
          {event.status === 'delayed' && (
            <span className="rounded-full bg-[#FF9F43] px-2.5 py-1 text-[11px] font-extrabold text-[#12091E]">
              DELAYED
            </span>
          )}
          {isCancelled && (
            <span className="rounded-full bg-[#FF4FD8]/20 px-2.5 py-1 text-[11px] font-extrabold text-[#FF4FD8]">
              CANCELLED
            </span>
          )}
          <CategoryChip category={event.category} />
        </div>

        <div className="space-y-1.5">
          <h1
            className={cn(
              'font-heading text-[34px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#F4F2FA]',
              isCancelled && 'line-through text-[#9C97B0]'
            )}
          >
            {event.title}
          </h1>
          {/* Prominent Date & Time Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1.5 pb-0.5">
            <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#FFD60A]/50 bg-[#FFD60A]/15 px-4 py-2 shadow-sm">
              <Calendar className="size-5 text-[#FFD60A] stroke-[2.5]" />
              <span className="font-heading text-lg sm:text-xl font-black uppercase tracking-tight text-[#FFD60A]">
                {dayStr}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[#3B2758] bg-[#1F1230] px-3.5 py-2 text-sm sm:text-base font-extrabold text-[#F4F2FA]">
              <Clock className="size-4 text-[#CFCBDD]" />
              <span>{rangeStr} IST</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm sm:text-[15px] font-semibold text-[#CFCBDD]">
            <MapPin className="size-4 shrink-0 text-[#FF4FD8]" />
            {venue ? (
              <Link
                href={`/venue/?id=${venue.id}`}
                className="text-[#FFE866] underline underline-offset-4 font-bold hover:text-[#FFD60A]"
              >
                {venue.name}
              </Link>
            ) : (
              <span className="font-bold text-[#F4F2FA]">{event.venue_name || 'Campus Venue (TBA)'}</span>
            )}
          </div>
        </div>

        {/* Hosted by */}
        <section className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3">
          <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-[#9B6CFF] font-heading text-base font-extrabold text-[#12091E]">
            {hostName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="block text-[11px] font-extrabold uppercase text-[#9C97B0]">
              HOSTED BY
            </span>
            <span className="block truncate text-[15px] font-extrabold text-[#F4F2FA]">
              {hostName}
            </span>
            {extra.host_coordinator && (
              <span className="block truncate text-xs text-[#BDB8CF]">
                Coordinator: {extra.host_coordinator}
              </span>
            )}
          </div>
          <Link
            href="/about/"
            className="inline-flex h-10 shrink-0 items-center rounded-[12px] border-[1.5px] border-[#3A3549] px-3 text-[13px] font-bold text-[#F4F2FA]"
          >
            Help
          </Link>
        </section>

        {/* Line-up Link */}
        <Link
          href={`/lineup/?id=${event.id}`}
          className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3 text-[#F4F2FA] hover:border-[#FFD60A]/60"
        >
          <span className="flex shrink-0">
            <span className="size-[34px] rounded-[12px] border-2 border-[#1F1230] bg-[#FF4FD8]" />
            <span className="-ml-3 size-[34px] rounded-[12px] border-2 border-[#1F1230] bg-[#22D3EE]" />
            <span className="-ml-3 size-[34px] rounded-[12px] border-2 border-[#1F1230] bg-[#FFE14D]" />
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <strong className="block text-[15px] font-extrabold">
              See the line-up
            </strong>
            <span className="block text-xs text-[#BDB8CF]">
              Performers, teams &amp; order
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-[#9C97B0]" />
        </Link>

        {/* Registration CTA */}
        {soon && !isCancelled && (
          <div className="space-y-2">
            {regNotOpen && regOpensAt ? (
              <div className="rounded-[20px] border-[1.5px] border-[#FFD60A]/50 bg-[#1F1230] px-4 py-3.5 text-sm font-bold text-[#FFD60A]">
                Registration opens at {formatTime(regOpensAt)} IST (
                {formatDay(regOpensAt)})
              </div>
            ) : regClosed ? (
              <div className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 py-3.5 text-sm font-bold text-[#9C97B0]">
                Registration closed
              </div>
            ) : (
              <a
                href={
                  isSafeHttpUrl(event.registration_url)
                    ? event.registration_url
                    : OFFICIAL_REGISTRATION_HUB
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[20px] bg-[#FFD60A] px-4 py-3.5 text-[#12091E] shadow-[5px_5px_0_#FF4FD8]"
              >
                <div className="space-y-0.5">
                  <span className="block text-base font-extrabold">
                    Register for {event.title}
                  </span>
                  <span className="block text-[13px] font-semibold">
                    Opens official Fiesta&apos;26 registration form
                  </span>
                </div>
                <ExternalLink className="size-6 shrink-0" />
              </a>
            )}
            <a
              href={OFFICIAL_REGISTRATION_HUB}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-[14px] border border-[#3B2758] bg-[#1F1230] px-3.5 py-2.5 text-xs font-semibold text-[#BDB8CF] hover:border-[#FFD60A]/60"
            >
              <span>All Fiesta&apos;26 registration forms</span>
              <span className="inline-flex items-center gap-1 font-bold text-[#FFD60A]">
                linktr.ee/sdmcetFiesta26
                <ExternalLink className="size-3" />
              </span>
            </a>
          </div>
        )}

        {/* Calendar & Directions */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3 text-sm font-bold text-[#F4F2FA]"
          >
            <CalendarPlus className="size-[18px] text-[#22D3EE]" />
            Add to calendar
          </a>
          {directionsExternal && venue?.maps_url ? (
            <a
              href={venue.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3 text-sm font-bold text-[#F4F2FA]"
            >
              <MapPin className="size-[18px] text-[#FF9F43]" />
              Take me there
            </a>
          ) : (
            <Link
              href={venue ? `/venue/?id=${venue.id}` : '/venues/'}
              className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3 text-sm font-bold text-[#F4F2FA]"
            >
              <MapPin className="size-[18px] text-[#FF9F43]" />
              Take me there
            </Link>
          )}
        </div>

        {/* Description */}
        {extra.description && (
          <section className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-1.5">
            <h2 className="text-xs font-extrabold uppercase text-[#9C97B0]">
              ABOUT THIS EVENT
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#CFCBDD]">
              {extra.description}
            </p>
          </section>
        )}

        {/* Results */}
        {extra.results.length > 0 && (
          <section className="space-y-2.5 pt-1">
            <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
              <Trophy className="size-5 text-[#FFE14D]" />
              Results &amp; Winners
            </h2>
            {extra.results.map((result) => (
              <div
                key={result.id}
                className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#F4F2FA]">{result.title}</span>
                  <span className="text-xs text-[#9C97B0]">
                    {formatTime(result.updated_at)} IST
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm text-[#CFCBDD]">
                  {result.body}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>

      <EventShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        event={event}
        venueName={venue?.name ?? event.venue_name}
      />
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-[#9C97B0]">Loading event…</div>}>
      <EventDetailInner />
    </Suspense>
  );
}
