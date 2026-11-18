'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  ExternalLink,
  MapPin,
  Megaphone,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { CATEGORY_DOT_COLOR, CATEGORY_LABELS } from '@/components/category-chip';
import {
  HuntMascots,
  MusicMascot,
  TechMascot,
} from '@/components/mascots';
import type { LiveData } from '@/lib/data/live';
import type { AppStatus } from '@/lib/modes';
import { formatTime, minutesUntil } from '@/lib/time';
import { cn } from '@/lib/utils';

interface LiveApiResponse extends LiveData {
  _source?: 'db' | 'cache' | 'fallback';
  appStatus?: AppStatus;
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

interface MyHuntMeResponse {
  signedIn: boolean;
  stamps?: number;
  total?: number;
  rank?: number | null;
}

async function fetchHuntMe(url: string): Promise<MyHuntMeResponse> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { signedIn: false };
  return res.json() as Promise<MyHuntMeResponse>;
}

interface HomeLiveFeedProps {
  festName: string;
  initialData: LiveData;
}

export function HomeLiveFeed({ festName, initialData }: HomeLiveFeedProps) {
  const router = useRouter();
  // ±30% polling jitter (14–26 s) to prevent thundering herd at 2,000 phones (PEAK_LOAD.md)
  const [pollIntervalMs, setPollIntervalMs] = useState(20_000);
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setPollIntervalMs(14_000 + Math.floor(Math.random() * 12_000));
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const { data, error, isValidating, mutate } = useSWR<LiveApiResponse>(
    '/api/live',
    fetchLive,
    {
      fallbackData: initialData,
      refreshInterval: pollIntervalMs,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      keepPreviousData: true,
      shouldRetryOnError: true,
      errorRetryInterval: 15_000,
    }
  );

  const { data: myHunt } = useSWR<MyHuntMeResponse>(
    '/api/hunt/me',
    fetchHuntMe,
    { revalidateOnFocus: true, shouldRetryOnError: false }
  );

  const liveData: LiveApiResponse = data ?? initialData;
  const appStatus = liveData.appStatus;

  // Auto-switch to /fest-over once when mode flips from fest -> campus
  useEffect(() => {
    if (appStatus?.mode !== 'campus') return;
    try {
      const seen = localStorage.getItem('fiesta26_fest_over_seen');
      if (!seen) {
        localStorage.setItem('fiesta26_fest_over_seen', '1');
        router.push('/fest-over');
      } else {
        router.push('/signals');
      }
    } catch {
      router.push('/fest-over');
    }
  }, [appStatus?.mode, router]);

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

  const changedIds = new Set(liveData.changedEventIds ?? []);
  const totalAlertCount =
    (liveData.changes?.length ?? 0) +
    (liveData.urgent ? 1 : 0);

  // Pick the most recent important update (urgent notice or latest event change)
  const latestChange = liveData.changes?.[0] ?? null;
  const secondChange = liveData.changes?.[1] ?? null;
  const latestAlert = liveData.urgent
    ? {
        headline: liveData.urgent.message,
        subline: latestChange
          ? `+ ${latestChange.message}`
          : liveData.announcements.length > 1
            ? `Tap to see all ${liveData.announcements.length} updates`
            : 'Important notice from the Fest Committee',
      }
    : latestChange
      ? {
          headline: latestChange.message,
          subline: secondChange
            ? `+ ${secondChange.message}`
            : 'Tap to see all schedule changes & notices',
        }
      : liveData.announcements[0]
        ? {
            headline: liveData.announcements[0].message,
            subline:
              liveData.announcements.length > 1
                ? `+ ${liveData.announcements.length - 1} more committee updates`
                : 'Tap to view all updates',
          }
        : null;

  const [featuredLive, ...otherLive] = liveData.now;
  const nextEvent = liveData.next[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Mobile Fiesta'26 Halftone Header Band (matching brand/preview-home.png) */}
      <header className="halftone-band -mx-4 flex items-center justify-between border-b border-[#3B2758] px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/fiesta26-logo.png"
            alt={festName}
            width={126}
            height={48}
            className="h-12 w-auto object-contain"
            priority
          />
          <span className="-rotate-3 rounded-lg bg-[#FFD60A] px-2.5 py-1 font-heading text-xs font-extrabold tracking-wider text-[#12091E] shadow-xs">
            LIVE
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {(error || liveData._source === 'cache') && (
            <button
              type="button"
              onClick={() => void mutate()}
              aria-label="Retry live refresh"
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#3B2758] bg-[#1F1230] px-2.5 text-[11px] font-bold text-[#FFE14D] cursor-pointer"
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
            className="flex size-[42px] items-center justify-center rounded-[14px] bg-[#FF4FD8] text-sm font-extrabold text-[#12091E] rotate-4 hover:rotate-0 transition-transform"
          >
            ME
          </Link>
        </div>
      </header>

      {/* Global Safety / Backup / Writes-Paused Banners */}
      {(liveData._source === 'cache' || liveData._source === 'fallback') && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#FFE14D]/60 bg-[#1F1230] px-3.5 py-2.5 text-xs font-bold text-[#FFE14D]"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          Running in backup mode — updates may be delayed.
        </div>
      )}

      {appStatus?.writes_paused && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#FF9F43]/60 bg-[#FF9F43]/15 px-3.5 py-2.5 text-xs font-bold text-[#FF9F43]"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          Votes and stamps are temporarily paused. Schedule browsing is live!
        </div>
      )}

      {appStatus?.banner && (
        <div
          role="status"
          className={cn(
            'rounded-2xl px-4 py-3 text-xs font-extrabold',
            appStatus.banner_level === 'critical'
              ? 'bg-[#FF4F5E] text-white'
              : appStatus.banner_level === 'warning'
                ? 'bg-[#FFE14D] text-[#12091E]'
                : 'bg-[#9B6CFF] text-[#12091E]'
          )}
        >
          {appStatus.banner}
        </div>
      )}

      {/* Important Updates Banner (matching updated 10-home.png) */}
      {latestAlert && (
        <Link
          href="/updates"
          className="flex items-center gap-3 rounded-[22px] bg-[#FFE14D] px-4 py-3.5 text-[#12091E] shadow-[4px_4px_0_#FF4F5E] transition-transform active:translate-y-0.5"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#12091E] text-[#FFE14D]">
            <Bell className="bell-ring size-5 stroke-[2.3]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]">
              <span className="size-2 rounded-full bg-[#FF4F5E]" />
              IMPORTANT
              {totalAlertCount > 0
                ? ` · ${totalAlertCount} ${totalAlertCount === 1 ? 'UPDATE' : 'UPDATES'}`
                : ' · UPDATES'}
            </span>
            <p className="line-clamp-2 text-[15px] font-extrabold leading-snug">
              {latestAlert.headline}
            </p>
            <p className="truncate text-xs font-semibold text-[#12091E]/80">
              {latestAlert.subline}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
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
              className="live-dot inline-block size-3 rounded-full bg-[#FF4FD8]"
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
              className="relative flex flex-col gap-2 overflow-hidden rounded-[24px] bg-[#FF4FD8] p-[18px] text-[#12091E] shadow-[5px_5px_0_#9B6CFF] transition-transform active:translate-y-0.5"
            >
              <span className="self-start rounded-full bg-[#12091E] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#FF4FD8]">
                LIVE · {CATEGORY_LABELS[featuredLive.category]}
              </span>
              <span className="max-w-[240px] font-heading text-[32px] font-extrabold leading-[0.96] tracking-[-0.03em]">
                {featuredLive.title}
              </span>
              <span className="text-sm font-semibold">
                {featuredLive.venue_name ?? 'Campus'} · ends{' '}
                {formatTime(featuredLive.ends_at)}
              </span>
              <span className="mt-1 self-start rounded-[12px] bg-[#12091E] px-3 py-2 text-[13px] font-extrabold text-[#FFD60A]">
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
                  className="flex items-center gap-3 rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 py-3.5 text-[#F4F2FA] transition-colors hover:border-[#22D3EE]"
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
          <div className="rounded-[22px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/60 p-5 text-center space-y-2">
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
              className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-[#FFD60A] px-4 text-sm font-extrabold text-[#12091E]"
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
            className="py-2 text-sm font-bold text-[#FFD60A] hover:text-[#E3FF9A]"
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
                  className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3 text-[#F4F2FA] transition-colors hover:border-[#FFD60A]/60"
                >
                  <span
                    className={cn(
                      'flex h-[52px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[14px] leading-none',
                      isFirst
                        ? 'bg-[#FFD60A] text-[#12091E]'
                        : 'bg-[#2A1840] text-[#F4F2FA]'
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
                      {changedIds.has(event.id) && (
                        <span className="font-extrabold text-[#FFE14D]">
                          {' '}
                          · changed
                        </span>
                      )}
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
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/50 p-5 text-center text-sm text-[#9C97B0]">
            No more upcoming events today. Check{' '}
            <Link href="/results" className="font-bold text-[#FFD60A] underline">
              Results
            </Link>{' '}
            for winners and live scores.
          </div>
        )}
      </section>

      {/* Stamp Hunt Card (live user progress + next live stamp) */}
      <section aria-label="Stamp Hunt">
        <Link
          href="/hunt"
          className="flex items-center gap-3 rounded-[24px] bg-[#9B6CFF] px-[18px] py-4 text-[#12091E] shadow-[5px_5px_0_#FFD60A] transition-transform active:translate-y-0.5"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.1em]">
              STAMP HUNT
              {liveData.hunt?.closesAt
                ? ` · CLOSES ${formatTime(liveData.hunt.closesAt).toUpperCase()}`
                : ' · CAMPUS QUEST'}
            </span>
            <span className="block font-heading text-[22px] font-extrabold leading-[1.06] tracking-[-0.02em]">
              {myHunt?.signedIn
                ? `You have ${myHunt.stamps ?? 0} of ${myHunt.total ?? liveData.hunt?.totalStamps ?? 0} stamps${myHunt.rank ? ` · #${myHunt.rank}` : ''}`
                : 'Join the hunt & win prizes'}
            </span>
            <span className="block text-sm font-semibold">
              {liveData.hunt?.liveStampName
                ? `${liveData.hunt.liveStampName} stamp is live now`
                : 'Scan QR stations across campus →'}
            </span>
          </div>
          <HuntMascots />
        </Link>
      </section>

      {/* Secondary Quick Access Strip */}
      <section
        aria-label="Explore more"
        className="grid grid-cols-4 gap-2 pt-1"
      >
        <a
          href="https://linktr.ee/sdmcetFiesta26"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#FFD60A]/60 bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#FFD60A] hover:border-[#FFD60A]"
        >
          <ExternalLink className="size-4 text-[#FFD60A]" aria-hidden="true" />
          Register
        </a>
        <Link
          href="/venues"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#FF9F43]"
        >
          <MapPin className="size-4 text-[#FF9F43]" aria-hidden="true" />
          Venues
        </Link>
        <Link
          href="/results"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#FFE14D]"
        >
          <Trophy className="size-4 text-[#FFE14D]" aria-hidden="true" />
          Results
        </Link>
        <Link
          href="/updates"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#22D3EE]"
        >
          <Megaphone className="size-4 text-[#22D3EE]" aria-hidden="true" />
          Updates
        </Link>
      </section>
    </div>
  );
}
