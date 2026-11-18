'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ChevronRight,
  MapPin,
  Megaphone,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { CATEGORY_DOT_COLOR, CATEGORY_LABELS } from '@/components/category-chip';
import {
  AlienMascot,
  HuntMascots,
  MusicMascot,
  TechMascot,
} from '@/components/mascots';
import type { LiveData } from '@/lib/data/live';
import { formatDay, formatTime, minutesUntil } from '@/lib/time';
import { cn } from '@/lib/utils';

interface LiveApiResponse extends LiveData {
  _source?: 'db' | 'cache' | 'fallback';
}

async function fetchLive(url: string): Promise<LiveApiResponse> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Live API returned ${res.status}`);
  }
  return res.json() as Promise<LiveApiResponse>;
}

function splitCountdownBadge(
  targetIso: string,
  now: Date
): { value: string; unit: string } {
  const mins = Math.max(0, minutesUntil(targetIso, now));
  if (mins < 60) {
    return { value: String(Math.max(1, mins)), unit: 'MIN' };
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return { value: String(hours), unit: hours === 1 ? 'HR' : 'HRS' };
  }
  const days = Math.floor(hours / 24);
  return { value: String(days), unit: days === 1 ? 'DAY' : 'DAYS' };
}

interface HomeLiveFeedProps {
  festName: string;
  initialData: LiveData;
}

export function HomeLiveFeed({ festName, initialData }: HomeLiveFeedProps) {
  const { data, error, isValidating, mutate } = useSWR<LiveApiResponse>(
    '/api/live',
    fetchLive,
    {
      fallbackData: initialData,
      refreshInterval: 20_000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      keepPreviousData: true,
      shouldRetryOnError: true,
      errorRetryInterval: 15_000,
    }
  );

  const liveData: LiveApiResponse = data ?? initialData;

  const [tickState, setTickState] = useState<{
    base: string;
    elapsedMs: number;
  }>({
    base: initialData.serverTime,
    elapsedMs: 0,
  });

  useEffect(() => {
    const base = liveData.serverTime;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setTickState({ base, elapsedMs: Date.now() - startedAt });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [liveData.serverTime]);

  const baseMs = new Date(liveData.serverTime).getTime();
  const elapsedMs =
    tickState.base === liveData.serverTime ? tickState.elapsedMs : 0;
  const syncedNow = new Date(baseMs + elapsedMs);

  const tickerItems = [
    ...(liveData.urgent ? [liveData.urgent.message] : []),
    ...liveData.announcements
      .filter((a) => a.id !== liveData.urgent?.id)
      .map((a) => a.message),
  ];

  const [featuredLive, ...otherLive] = liveData.now;
  const nextEvent = liveData.next[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Mobile Neon Night Header (desktop uses AppShell top nav) */}
      <header className="flex items-center justify-between pt-1 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <AlienMascot size={40} />
          <div className="flex flex-col">
            <span className="font-heading text-[24px] font-extrabold leading-none tracking-[-0.03em] text-[#F4F2FA]">
              fest<span className="text-[#C6FF3D]">.</span>live
            </span>
            <span className="mt-0.5 text-xs text-[#9C97B0]">
              {festName} · {formatDay(syncedNow)}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {(error || liveData._source === 'cache') && (
            <button
              type="button"
              onClick={() => void mutate()}
              aria-label="Retry live refresh"
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#2E2A3D] bg-[#16141F] px-2.5 text-[11px] font-bold text-[#FFE14D] cursor-pointer"
            >
              <RefreshCw
                className={cn('size-3', isValidating && 'animate-spin')}
                aria-hidden="true"
              />
              Updating
            </button>
          )}
          <Link
            href="/account"
            aria-label="My account"
            className="flex size-[42px] items-center justify-center rounded-[14px] bg-[#FF4FA3] text-sm font-extrabold text-[#0B0A12] rotate-4 hover:rotate-0 transition-transform"
          >
            ME
          </Link>
        </div>
      </header>

      {/* Slanted Neon Lime Announcement Ticker */}
      {tickerItems.length > 0 && (
        <Link
          href="/announcements"
          aria-label={`Latest update: ${tickerItems[0]}`}
          className="-mx-5 flex h-9 items-center overflow-hidden bg-[#C6FF3D] text-[#0B0A12] -rotate-[1deg] lg:mx-0 lg:rounded-2xl lg:rotate-0"
        >
          <div
            aria-hidden="true"
            className="ticker-track flex items-center gap-5 whitespace-nowrap px-4 text-[13px] font-extrabold uppercase tracking-[0.04em]"
          >
            {[...tickerItems, ...tickerItems].map((msg, idx) => (
              <span key={idx} className="inline-flex items-center gap-5">
                <span>{msg}</span>
                <span>✦</span>
              </span>
            ))}
          </div>
        </Link>
      )}

      {/* Happening now */}
      <section aria-labelledby="heading-now" className="space-y-3">
        <div className="flex items-center justify-between">
          <h1
            id="heading-now"
            className="flex items-center gap-2.5 font-heading text-[26px] font-extrabold tracking-[-0.02em] text-[#F4F2FA]"
          >
            <span
              className="live-dot inline-block size-3 rounded-full bg-[#FF4FA3]"
              aria-hidden="true"
            />
            Happening now
          </h1>
          <span className="text-xs font-semibold text-[#9C97B0]">
            {formatTime(syncedNow)} IST
          </span>
        </div>

        {featuredLive ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {/* Primary featured live neon pink card */}
            <Link
              href={`/events/${featuredLive.id}`}
              className="relative flex flex-col gap-2 overflow-hidden rounded-[24px] bg-[#FF4FA3] p-[18px] text-[#0B0A12] shadow-[5px_5px_0_#A78BFA] transition-transform active:translate-y-0.5"
            >
              <span className="self-start rounded-full bg-[#0B0A12] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#FF4FA3]">
                LIVE · {CATEGORY_LABELS[featuredLive.category]}
              </span>
              <span className="max-w-[240px] font-heading text-[32px] font-extrabold leading-[0.96] tracking-[-0.03em]">
                {featuredLive.title}
              </span>
              <span className="text-sm font-semibold">
                {featuredLive.venue_name ?? 'Campus'} · ends{' '}
                {formatTime(featuredLive.ends_at)}
              </span>
              <span className="mt-1 self-start rounded-[12px] bg-[#0B0A12] px-3 py-2 text-[13px] font-extrabold text-[#C6FF3D]">
                OPEN LIVE EVENT →
              </span>
              <MusicMascot
                size={112}
                className="pointer-events-none absolute -right-1.5 -bottom-2"
              />
            </Link>

            {/* Secondary live event cards */}
            <div className="flex flex-col gap-3">
              {otherLive.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center gap-3 rounded-[22px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-4 py-3.5 text-[#F4F2FA] transition-colors hover:border-[#22D3EE]"
                >
                  <TechMascot size={50} className="shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span
                      className="block text-[11px] font-extrabold uppercase tracking-[0.1em]"
                      style={{ color: CATEGORY_DOT_COLOR[event.category] }}
                    >
                      LIVE · {CATEGORY_LABELS[event.category]} · ends{' '}
                      {formatTime(event.ends_at)}
                    </span>
                    <span className="block truncate text-[17px] font-bold text-[#F4F2FA]">
                      {event.title}
                    </span>
                    <span className="block truncate text-[13px] text-[#9C97B0]">
                      {event.venue_name ?? 'Venue TBA'}
                    </span>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-[#9C97B0]"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border-[1.5px] border-dashed border-[#2E2A3D] bg-[#16141F]/60 p-5 text-center space-y-2">
            <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
              Nothing live right now
            </p>
            <p className="text-sm text-[#9C97B0]">
              {nextEvent
                ? `Next up: ${nextEvent.title} at ${formatTime(nextEvent.starts_at)}${nextEvent.venue_name ? ` (${nextEvent.venue_name})` : ''}.`
                : 'Explore the full events list to plan your day.'}
            </p>
            <Link
              href={nextEvent ? `/events/${nextEvent.id}` : '/events'}
              className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-[#C6FF3D] px-4 text-sm font-extrabold text-[#0B0A12]"
            >
              {nextEvent ? 'See next event' : 'Browse events'}
            </Link>
          </div>
        )}
      </section>

      {/* Up next */}
      <section aria-labelledby="heading-next" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2
            id="heading-next"
            className="font-heading text-[26px] font-extrabold tracking-[-0.02em] text-[#F4F2FA]"
          >
            Up next
          </h2>
          <Link
            href="/events"
            className="py-2 text-sm font-bold text-[#C6FF3D] hover:text-[#E3FF9A]"
          >
            See all
          </Link>
        </div>

        {liveData.next.length > 0 ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {liveData.next.map((event, idx) => {
              const badge = splitCountdownBadge(event.starts_at, syncedNow);
              const isFirst = idx === 0;
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-3.5 py-3 text-[#F4F2FA] transition-colors hover:border-[#C6FF3D]/60"
                >
                  <span
                    className={cn(
                      'flex h-[52px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[14px] leading-none',
                      isFirst
                        ? 'bg-[#C6FF3D] text-[#0B0A12]'
                        : 'bg-[#24212F] text-[#F4F2FA]'
                    )}
                  >
                    <span className="font-heading text-[22px] font-extrabold">
                      {badge.value}
                    </span>
                    <span className="mt-0.5 text-[10px] font-extrabold tracking-[0.08em]">
                      {badge.unit}
                    </span>
                  </span>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="block truncate text-[16px] font-bold text-[#F4F2FA]">
                      {event.title}
                    </span>
                    <span className="block truncate text-[13px] text-[#9C97B0]">
                      {formatTime(event.starts_at)} ·{' '}
                      {event.venue_name ?? 'Venue TBA'}
                    </span>
                  </div>

                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_DOT_COLOR[event.category] }}
                    aria-label={CATEGORY_LABELS[event.category]}
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#2E2A3D] bg-[#16141F]/50 p-5 text-center text-sm text-[#9C97B0]">
            No more upcoming events today. Check{' '}
            <Link href="/results" className="font-bold text-[#C6FF3D] underline">
              Results
            </Link>{' '}
            for winners and live scores.
          </div>
        )}
      </section>

      {/* Stamp Hunt Promo Card */}
      <section aria-label="Stamp Hunt">
        <Link
          href="/hunt"
          className="flex items-center gap-3 rounded-[24px] bg-[#A78BFA] px-[18px] py-4 text-[#0B0A12] shadow-[5px_5px_0_#C6FF3D] transition-transform active:translate-y-0.5"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.1em]">
              STAMP HUNT · CAMPUS QUEST
            </span>
            <span className="block font-heading text-[22px] font-extrabold leading-[1.06] tracking-[-0.02em]">
              Scan QR stations & climb the leaderboard
            </span>
            <span className="block text-sm font-semibold">
              Tap to view your passport & top hunters →
            </span>
          </div>
          <HuntMascots />
        </Link>
      </section>

      {/* Secondary Quick Access Strip */}
      <section
        aria-label="Explore more"
        className="grid grid-cols-3 gap-2.5 pt-1"
      >
        <Link
          href="/venues"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#FF9F43]"
        >
          <MapPin className="size-4 text-[#FF9F43]" aria-hidden="true" />
          Venues
        </Link>
        <Link
          href="/results"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#FFE14D]"
        >
          <Trophy className="size-4 text-[#FFE14D]" aria-hidden="true" />
          Results
        </Link>
        <Link
          href="/announcements"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#22D3EE]"
        >
          <Megaphone className="size-4 text-[#22D3EE]" aria-hidden="true" />
          Updates
        </Link>
      </section>
    </div>
  );
}
