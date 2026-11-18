import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  MapPin,
  Trophy,
  Vote,
} from 'lucide-react';
import { CategoryChip } from '@/components/category-chip';
import { EventCover } from '@/components/event-cover';
import {
  EventCountdownBoxes,
  EventShareIconButton,
} from '@/components/event-detail-client';
import { getEvent, listEvents } from '@/lib/data/events';
import { getPollByEvent } from '@/lib/data/voting';
import {
  formatDay,
  formatRange,
  formatTime,
  isLive,
  isUpNext,
  toGoogleCalendarUtc,
} from '@/lib/time';
import { cn } from '@/lib/utils';

export const revalidate = 30;
export const dynamicParams = true;

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export async function generateStaticParams() {
  try {
    const events = await listEvents();
    return events.map((event) => ({ id: event.id }));
  } catch (error) {
    console.error('[events/[id]] generateStaticParams failed:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await getEvent(id);
    if (!event) return { title: 'Event not found' };
    const when = `${formatDay(event.starts_at)}, ${formatRange(event.starts_at, event.ends_at)} IST`;
    const where = event.venue_name ? ` at ${event.venue_name}` : '';
    const summary = event.description
      ? `${when}${where}. ${event.description.slice(0, 140)}`
      : `${when}${where}.`;

    return {
      title: event.title,
      description: summary,
      openGraph: {
        title: event.title,
        description: summary,
        type: 'article',
      },
    };
  } catch {
    return { title: 'Event details' };
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, poll] = await Promise.all([
    getEvent(id),
    getPollByEvent(id).catch(() => null),
  ]);

  if (!event) {
    notFound();
  }

  const now = new Date();
  const live = isLive(event, now);
  const soon = isUpNext(event, now);
  const isCancelled = event.status === 'cancelled';

  const extEvent = event as unknown as {
    registration_opens_at?: string | null;
    registration_closes_at?: string | null;
  };
  const regOpensAt = extEvent.registration_opens_at
    ? new Date(extEvent.registration_opens_at)
    : null;
  const regClosesAt = extEvent.registration_closes_at
    ? new Date(extEvent.registration_closes_at)
    : null;
  const regNotOpenYet = Boolean(regOpensAt && now < regOpensAt);
  const regClosed = Boolean(regClosesAt && now > regClosesAt);
  const pollOpen = Boolean(
    poll &&
      poll.enabled &&
      (!poll.opens_at || now >= new Date(poll.opens_at)) &&
      (!poll.closes_at || now <= new Date(poll.closes_at))
  );

  const dayStr = formatDay(event.starts_at);
  const rangeStr = formatRange(event.starts_at, event.ends_at);
  const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";

  const gcalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.title} (${festName})`,
    dates: `${toGoogleCalendarUtc(event.starts_at)}/${toGoogleCalendarUtc(event.ends_at)}`,
    details: event.description ?? `${event.title} at ${festName}`,
    location: event.venue_name ?? '',
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;
  const shareText = `${event.title} — ${dayStr}, ${rangeStr} IST${event.venue_name ? ` at ${event.venue_name}` : ''}`;

  const hostName = event.host_name || event.contact_info || 'Fest Committee';
  const directionsHref = isSafeHttpUrl(event.venue?.maps_url)
    ? event.venue.maps_url
    : event.venue
      ? `/venues/${event.venue.id}`
      : '/venues';
  const directionsExternal = isSafeHttpUrl(event.venue?.maps_url);

  return (
    <div className="pb-6">
      {/* Full-bleed Hero Cover (matching 12-event.png) */}
      <div className="relative overflow-hidden lg:mt-4 lg:rounded-[24px]">
        <EventCover
          title={event.title}
          category={event.category}
          coverUrl={event.cover_url}
          variant="hero"
        />
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between">
          <Link
            href="/events"
            aria-label="Back to events"
            className="flex size-11 items-center justify-center rounded-[14px] bg-[#12091E]/90 text-[#F4F2FA] backdrop-blur-xs hover:bg-[#12091E]"
          >
            <ArrowLeft className="size-5 stroke-[2.5]" aria-hidden="true" />
          </Link>
          <EventShareIconButton title={event.title} shareText={shareText} />
        </div>
      </div>

      {/* Overlapping Neon Night Content Sheet */}
      <div className="relative -mt-6 space-y-3.5 rounded-t-[24px] bg-[#12091E] px-4 pt-4">
        {/* Status + Category pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4FD8] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#12091E]">
              <span className="live-dot size-1.5 rounded-full bg-[#12091E]" />
              LIVE NOW
            </span>
          )}
          {!live && soon && (
            <span className="rounded-full bg-[#FFE14D] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#12091E]">
              COMING SOON
            </span>
          )}
          {event.status === 'delayed' && (
            <span className="rounded-full bg-[#FF9F43] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#12091E]">
              DELAYED
            </span>
          )}
          {isCancelled && (
            <span className="rounded-full bg-[#FF4FD8]/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#FF4FD8]">
              CANCELLED
            </span>
          )}
          {!live && !soon && !isCancelled && (
            <span className="rounded-full bg-[#3A3549] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#F4F2FA]">
              DONE
            </span>
          )}
          <CategoryChip category={event.category} />
        </div>

        {/* Title & Time/Venue */}
        <div className="space-y-1.5">
          <h1
            className={cn(
              'font-heading text-[34px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#F4F2FA]',
              isCancelled && 'line-through text-[#9C97B0]'
            )}
          >
            {event.title}
          </h1>
          <p className="text-[15px] font-semibold text-[#CFCBDD]">
            {dayStr} · {rangeStr} ·{' '}
            {event.venue ? (
              <Link
                href={`/venues/${event.venue.id}`}
                className="text-[#FFD60A] underline underline-offset-4 hover:text-[#E3FF9A]"
              >
                {event.venue.name}
              </Link>
            ) : (
              <span>Venue TBA</span>
            )}
          </p>
        </div>

        {/* Live 3-box countdown when upcoming */}
        {soon && !isCancelled && (
          <EventCountdownBoxes
            startsAtIso={event.starts_at}
            serverTimeIso={now.toISOString()}
          />
        )}

        {/* Hosted by card */}
        <section
          aria-label="Host"
          className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3"
        >
          <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-[#9B6CFF] font-heading text-base font-extrabold text-[#12091E]">
            {getInitials(hostName)}
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9C97B0]">
              HOSTED BY
            </span>
            <span className="block truncate text-[15px] font-extrabold text-[#F4F2FA]">
              {hostName}
            </span>
            {(event.host_coordinator ||
              (event.host_name && event.contact_info)) && (
              <span className="block truncate text-xs text-[#BDB8CF]">
                {event.host_coordinator
                  ? `Coordinator: ${event.host_coordinator}`
                  : event.contact_info}
              </span>
            )}
          </div>
          <Link
            href="/about"
            className="inline-flex h-10 shrink-0 items-center rounded-[12px] border-[1.5px] border-[#3A3549] px-3 text-[13px] font-bold text-[#F4F2FA] hover:border-[#FFD60A]"
          >
            Help
          </Link>
        </section>

        {/* See the line-up link card */}
        <Link
          href={`/events/${event.id}/line-up`}
          className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3 text-[#F4F2FA] hover:border-[#FFD60A]/60 transition-colors"
        >
          <span className="flex shrink-0" aria-hidden="true">
            <span className="size-[34px] rounded-[12px] border-2 border-[#1F1230] bg-[#FF4FD8]" />
            <span className="-ml-3 size-[34px] rounded-[12px] border-2 border-[#1F1230] bg-[#22D3EE]" />
            <span className="-ml-3 size-[34px] rounded-[12px] border-2 border-[#1F1230] bg-[#FFE14D]" />
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <strong className="block text-[15px] font-extrabold">
              See the line-up
            </strong>
            <span className="block text-xs text-[#BDB8CF]">
              Performers, teams & event order
            </span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-[#9C97B0]"
            aria-hidden="true"
          />
        </Link>

        {/* Direct Audience Voting button when voting is open for this competition */}
        {pollOpen && (
          <Link
            href={`/vote/${event.id}`}
            className="flex items-center gap-3 rounded-[20px] bg-[#FF4FD8] px-4 py-3.5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] active:translate-y-0.5 transition-transform"
          >
            <Vote className="size-8 shrink-0 stroke-[2.2]" aria-hidden="true" />
            <div className="space-y-0.5">
              <span className="block text-base font-extrabold">
                Vote now for {event.title}
              </span>
              <span className="block text-[13px] font-semibold">
                Tap to cast your live audience vote — open to everyone!
              </span>
            </div>
          </Link>
        )}

        {/* Primary CTA: Registration (respecting host registration window) */}
        {soon && !isCancelled ? (
          <div className="space-y-2">
            {regNotOpenYet && regOpensAt ? (
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
                className="flex items-center justify-between gap-3 rounded-[20px] bg-[#FFD60A] px-4 py-3.5 text-[#12091E] shadow-[5px_5px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
              >
                <div className="space-y-0.5">
                  <span className="block text-base font-extrabold">
                    Register for {event.title}
                  </span>
                  <span className="block text-[13px] font-semibold">
                    {isSafeHttpUrl(event.registration_url)
                      ? "Opens official Fiesta'26 registration form"
                      : "Opens official Fiesta'26 Linktree registration hub"}
                  </span>
                </div>
                <ExternalLink className="size-6 shrink-0" aria-hidden="true" />
              </a>
            )}
            <a
              href={OFFICIAL_REGISTRATION_HUB}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-[14px] border border-[#3B2758] bg-[#1F1230] px-3.5 py-2.5 text-xs font-semibold text-[#BDB8CF] hover:border-[#FFD60A]/60 hover:text-[#F4F2FA]"
            >
              <span>All Fiesta&apos;26 registration forms</span>
              <span className="inline-flex items-center gap-1 font-bold text-[#FFD60A]">
                linktr.ee/sdmcetFiesta26
                <ExternalLink className="size-3" aria-hidden="true" />
              </span>
            </a>
          </div>
        ) : !pollOpen ? (
          <Link
            href={`/vote/${event.id}`}
            className="flex items-center gap-3 rounded-[20px] bg-[#FFD60A] px-4 py-3.5 text-[#12091E] shadow-[5px_5px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
          >
            <Vote className="size-8 shrink-0 stroke-[2.2]" aria-hidden="true" />
            <div className="space-y-0.5">
              <span className="block text-base font-extrabold">
                {live
                  ? 'Audience voting'
                  : `Audience voting opens at ${formatTime(event.starts_at)}`}
              </span>
              <span className="block text-[13px] font-semibold">
                Check live audience voting for this competition
              </span>
            </div>
          </Link>
        ) : null}

        {/* Side-by-side Calendar & Directions buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3 text-sm font-bold text-[#F4F2FA] hover:border-[#22D3EE]"
          >
            <CalendarPlus
              className="size-[18px] text-[#22D3EE]"
              aria-hidden="true"
            />
            Add to calendar
          </a>

          {directionsExternal ? (
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3 text-sm font-bold text-[#F4F2FA] hover:border-[#FF9F43]"
            >
              <MapPin
                className="size-[18px] text-[#FF9F43]"
                aria-hidden="true"
              />
              Take me there
            </a>
          ) : (
            <Link
              href={directionsHref}
              className="flex h-[50px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3 text-sm font-bold text-[#F4F2FA] hover:border-[#FF9F43]"
            >
              <MapPin
                className="size-[18px] text-[#FF9F43]"
                aria-hidden="true"
              />
              Take me there
            </Link>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <section className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-1.5">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9C97B0]">
              ABOUT THIS EVENT
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#CFCBDD]">
              {event.description}
            </p>
          </section>
        )}

        {/* Results block if present */}
        {event.results.length > 0 && (
          <section className="space-y-2.5 pt-1">
            <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
              <Trophy className="size-5 text-[#FFE14D]" aria-hidden="true" />
              Results & Scores
            </h2>
            {event.results.map((result) => (
              <div
                key={result.id}
                className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#F4F2FA]">
                    {result.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {result.is_live && (
                      <span className="rounded-full bg-[#FF4FD8] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                        LIVE
                      </span>
                    )}
                    <span className="text-xs text-[#9C97B0]">
                      {formatTime(result.updated_at)} IST
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#CFCBDD]">
                  {result.body}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
