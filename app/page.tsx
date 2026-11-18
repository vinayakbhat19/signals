'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  ExternalLink,
  Lock,
  MapPin,
  Megaphone,
  RefreshCw,
  Trophy,
  Vote,
  WifiOff,
} from 'lucide-react';
import { AccountAvatar } from '@/components/account-avatar';
import { CATEGORY_DOT_COLOR, CATEGORY_LABELS } from '@/components/category-chip';
import { EventsTicker } from '@/components/events-ticker';
import {
  HuntMascots,
  MusicMascot,
  TechMascot,
} from '@/components/mascots';
import { useLiveFeed } from '@/lib/live-store';
import { useAuth } from '@/lib/use-auth';
import { formatTime, isLive, isUpNext, minutesUntil } from '@/lib/time';
import { cn } from '@/lib/utils';

const FEST_START_FALLBACK_ISO = '2026-11-25T00:00:00+05:30';

function splitFestCountdown(targetMs: number, nowMs: number) {
  const diff = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diff / 86_400);
  const hours = Math.floor((diff % 86_400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return {
    active: diff > 0,
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

function splitCountdownBadge(
  targetIso: string,
  now: Date
): { value: string; unit: string } {
  const mins = Math.max(0, minutesUntil(targetIso, now));
  if (mins < 60) return { value: String(Math.max(1, mins)), unit: 'MIN' };
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return { value: String(hours), unit: hours === 1 ? 'HR' : 'HRS' };
  }
  const days = Math.floor(hours / 24);
  return { value: String(days), unit: days === 1 ? 'DAY' : 'DAYS' };
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { feed, source, offline, refresh } = useLiveFeed();
  const [nowMs, setNowMs] = useState<number>(() =>
    new Date(feed.server_time).getTime()
  );

  const festName = feed.status.fest_name || "Fiesta'26";
  const festStartMs = new Date(
    feed.status.fest_starts_at || FEST_START_FALLBACK_ISO
  ).getTime();

  useEffect(() => {
    if (feed.status.mode !== 'campus') return;
    try {
      const seen = localStorage.getItem('fiesta26_fest_over_seen');
      if (!seen) {
        localStorage.setItem('fiesta26_fest_over_seen', '1');
        router.push('/fest-over/');
      } else {
        router.push('/signals/');
      }
    } catch {
      router.push('/fest-over/');
    }
  }, [feed.status.mode, router]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setNowMs(Date.now()));
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  const syncedNow = new Date(nowMs);
  const nowEvents = feed.events.filter((e) => isLive(e, syncedNow));
  const nextEvents = feed.events.filter((e) => isUpNext(e, syncedNow)).slice(0, 5);
  const [featuredLive, ...otherLive] = nowEvents;
  const nextEvent = nextEvents[0] ?? null;

  const festCountdown = splitFestCountdown(festStartMs, nowMs);
  const changedIds = new Set(feed.changes.map((c) => c.event_id));
  const urgentNotice =
    feed.notices.find((n) => n.priority === 'urgent') ?? null;

  const latestChange = feed.changes[0] ?? null;
  const secondChange = feed.changes[1] ?? null;
  const totalAlertCount = feed.changes.length + (urgentNotice ? 1 : 0);

  const latestAlert = urgentNotice
    ? {
      headline: urgentNotice.message,
      subline: latestChange
        ? `+ ${latestChange.message}`
        : 'Important notice from the Fest Committee',
    }
    : latestChange
      ? {
        headline: latestChange.message,
        subline: secondChange
          ? `+ ${secondChange.message}`
          : 'Tap to see all schedule changes & notices',
      }
      : feed.notices[0]
        ? {
          headline: feed.notices[0].message,
          subline:
            feed.notices.length > 1
              ? `+ ${feed.notices.length - 1} more committee updates`
              : 'Tap to view all updates',
        }
        : null;

  return (
    <div className="space-y-6">
      {/* Mobile Fiesta'26 Halftone Header */}
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
          {(offline || source === 'backup') && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#3B2758] bg-[#1F1230] px-2.5 text-[11px] font-bold text-[#FFE14D] cursor-pointer"
            >
              {offline ? (
                <>
                  <WifiOff className="size-3" />
                  Offline
                </>
              ) : (
                <>
                  <RefreshCw className="size-3" />
                  Backup
                </>
              )}
            </button>
          )}
          <AccountAvatar size="md" />
        </div>
      </header>

      {/* Tilted Neon Yellow Event Timings Ticker */}
      <div className="!mt-2 lg:!mt-0">
        <EventsTicker events={feed.events} changes={feed.changes} />
      </div>

      {/* Safety / Backup / Paused / Emergency Banners */}
      {source === 'backup' && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#FFE14D]/60 bg-[#1F1230] px-3.5 py-2.5 text-xs font-bold text-[#FFE14D]"
        >
          <AlertTriangle className="size-4 shrink-0" />
          Running in backup mode — updates may be delayed.
        </div>
      )}

      {feed.status.writes_paused && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-[#FF9F43]/60 bg-[#FF9F43]/15 px-3.5 py-2.5 text-xs font-bold text-[#FF9F43]"
        >
          <AlertTriangle className="size-4 shrink-0" />
          Votes and stamps are temporarily paused. Schedule browsing is live!
        </div>
      )}

      {feed.status.banner && (
        <div
          role="status"
          className={cn(
            'rounded-2xl px-4 py-3 text-xs font-extrabold',
            feed.status.banner_level === 'critical'
              ? 'bg-[#FF4F5E] text-white'
              : feed.status.banner_level === 'warning'
                ? 'bg-[#FFE14D] text-[#12091E]'
                : 'bg-[#9B6CFF] text-[#12091E]'
          )}
        >
          {feed.status.banner}
        </div>
      )}

      {/* Important Updates Banner */}
      {latestAlert && (
        <Link
          href="/updates/"
          className="flex items-center gap-3 rounded-[22px] bg-[#FFE14D] px-4 py-3.5 text-[#12091E] shadow-[4px_4px_0_#FF4F5E] transition-transform active:translate-y-0.5"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#12091E] text-[#FFE14D]">
            <Bell className="bell-ring size-5 stroke-[2.3]" />
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
          <ChevronRight className="size-5 shrink-0" />
        </Link>
      )}

      {/* Open Polls Banner when Live */}
      {feed.polls.length > 0 && (
        <Link
          href={
            feed.polls.length === 1
              ? `/vote/?id=${feed.polls[0].event_id}`
              : '/vote/'
          }
          className="flex items-center justify-between gap-3 rounded-[22px] bg-[#FF4FD8] px-4 py-3.5 text-[#12091E] shadow-[5px_5px_0_#FFD60A]"
        >
          <div className="flex items-center gap-3">
            <Vote className="size-6 shrink-0 stroke-[2.4]" />
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider">
                AUDIENCE VOTING LIVE
              </p>
              <p className="font-heading text-lg font-extrabold leading-tight">
                {feed.polls.length === 1
                  ? feed.polls[0].title || 'Vote now!'
                  : `${feed.polls.length} competitions open for voting`}
              </p>
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0" />
        </Link>
      )}

      {/* Countdown (before 25 Nov) OR Happening now (once countdown finishes) */}
      {festCountdown.active && !featuredLive ? (
        <section aria-labelledby="heading-countdown" className="space-y-3">
          <div className="rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 text-center space-y-4 shadow-[4px_4px_0_#9B6CFF]">
            <div className="space-y-1">
              <p
                id="heading-countdown"
                className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF4FD8]"
              >
                COUNTDOWN TO {festName.toUpperCase()} · 25–28 NOV
              </p>
              <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
                Get ready for 4 days of Fiesta&apos;26
              </h1>
            </div>

            <div
              aria-label="Countdown to 25 November"
              className="grid grid-cols-4 gap-2"
            >
              {[
                { value: festCountdown.days, label: 'DAYS' },
                { value: festCountdown.hours, label: 'HRS' },
                { value: festCountdown.minutes, label: 'MIN' },
                { value: festCountdown.seconds, label: 'SEC' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center justify-center rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#12091E] py-2.5"
                >
                  <span className="font-display text-2xl leading-none text-[#FFD60A] sm:text-3xl">
                    {unit.value}
                  </span>
                  <span className="mt-1 text-[10px] font-extrabold tracking-[0.1em] text-[#9C97B0]">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-sm text-[#BDB8CF]">
              {festName} hasn&apos;t started yet — events go live when the
              countdown finishes. Explore all 21 competitions &amp; register
              now!
            </p>
            <Link
              href="/events/"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] shadow-[3px_3px_0_#FF4FD8]"
            >
              Browse events
            </Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="heading-now" className="space-y-3">
          <div className="flex items-center justify-between">
            <h1
              id="heading-now"
              className="flex items-center gap-2.5 font-heading text-[26px] font-extrabold tracking-[-0.02em] text-[#F4F2FA]"
            >
              <span className="live-dot inline-block size-3 rounded-full bg-[#FF4FD8]" />
              Happening now
            </h1>
            <span className="text-xs font-semibold text-[#9C97B0]">
              {formatTime(syncedNow)} IST
            </span>
          </div>

          {featuredLive ? (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              <Link
                href={`/event/?id=${featuredLive.id}`}
                className="relative flex flex-col gap-2 overflow-hidden rounded-[24px] bg-[#FF4FD8] p-[18px] text-[#12091E] shadow-[5px_5px_0_#9B6CFF]"
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

              <div className="flex flex-col gap-3">
                {otherLive.map((event) => (
                  <Link
                    key={event.id}
                    href={`/event/?id=${event.id}`}
                    className="flex items-center gap-3 rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 py-3.5 text-[#F4F2FA] hover:border-[#22D3EE]"
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
                    <ChevronRight className="size-5 shrink-0 text-[#9C97B0]" />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 text-center space-y-3.5 shadow-[4px_4px_0_#9B6CFF]">
              <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                Nothing live right now
              </p>
              <p className="text-sm text-[#BDB8CF]">
                {nextEvent
                  ? `Next up: ${nextEvent.title} at ${formatTime(nextEvent.starts_at)}${nextEvent.venue_name ? ` (${nextEvent.venue_name})` : ''}.`
                  : 'Explore all 21 official competitions and register now.'}
              </p>
              <Link
                href={nextEvent ? `/event/?id=${nextEvent.id}` : '/events/'}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] shadow-[3px_3px_0_#FF4FD8]"
              >
                {nextEvent ? 'See next event' : 'Browse events'}
              </Link>
            </div>
          )}
        </section>
      )}

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
            href="/events/"
            className="py-2 text-sm font-bold text-[#FFD60A] hover:text-[#E3FF9A]"
          >
            See all
          </Link>
        </div>

        {nextEvents.length > 0 ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {nextEvents.map((event, idx) => {
              const badge = splitCountdownBadge(event.starts_at, syncedNow);
              return (
                <Link
                  key={event.id}
                  href={`/event/?id=${event.id}`}
                  className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3 text-[#F4F2FA] hover:border-[#FFD60A]/60"
                >
                  <span
                    className={cn(
                      'flex h-[52px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[14px] leading-none',
                      idx === 0
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
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/50 p-5 text-center text-sm text-[#9C97B0]">
            No upcoming events right now. Check{' '}
            <Link href="/results/" className="font-bold text-[#FFD60A] underline">
              Results
            </Link>
            .
          </div>
        )}
      </section>

      {/* Treasure Hunt Card (details hidden until logged in) */}
      <section aria-label="Treasure Hunt">
        {user ? (
          <Link
            href="/hunt/"
            className="flex items-center gap-3 rounded-[24px] bg-[#9B6CFF] px-[18px] py-4 text-[#12091E] shadow-[5px_5px_0_#FFD60A]"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.1em]">
                TREASURE HUNT · UNLOCKED
              </span>
              <span className="block font-heading text-[22px] font-extrabold leading-[1.06] tracking-[-0.02em]">
                Solve clues &amp; win prizes
              </span>
              <span className="block text-sm font-semibold">
                Open your clues &amp; leaderboard →
              </span>
            </div>
            <HuntMascots />
          </Link>
        ) : (
          <Link
            href="/login/?next=/hunt/"
            className="flex items-center gap-3 rounded-[24px] border-[1.5px] border-[#9B6CFF]/60 bg-[#1F1230] px-[18px] py-4 text-[#F4F2FA] shadow-[4px_4px_0_#9B6CFF] hover:border-[#FFD60A]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#9B6CFF]/20 text-[#9B6CFF]">
              <Lock className="size-6" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#FFD60A]">
                TREASURE HUNT · SIGN IN REQUIRED
              </span>
              <span className="block font-heading text-lg font-extrabold leading-tight">
                Log in to unlock Hunt &amp; Leaderboard
              </span>
              <span className="block text-xs text-[#BDB8CF]">
                Clues and rankings are revealed after you sign in.
              </span>
            </div>
            <ChevronRight className="size-5 shrink-0 text-[#FFD60A]" />
          </Link>
        )}
      </section>

      {/* Secondary Quick Access Strip */}
      <section aria-label="Explore more" className="grid grid-cols-4 gap-2 pt-1">
        <a
          href="https://linktr.ee/sdmcetFiesta26"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#FFD60A]/60 bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#FFD60A] hover:border-[#FFD60A]"
        >
          <ExternalLink className="size-4 text-[#FFD60A]" />
          Register
        </a>
        <Link
          href="/venues/"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#FF9F43]"
        >
          <MapPin className="size-4 text-[#FF9F43]" />
          Venues
        </Link>
        <Link
          href="/results/"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#FFE14D]"
        >
          <Trophy className="size-4 text-[#FFE14D]" />
          Results
        </Link>
        <Link
          href="/updates/"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2 py-2.5 text-xs font-bold text-[#F4F2FA] hover:border-[#22D3EE]"
        >
          <Megaphone className="size-4 text-[#22D3EE]" />
          Updates
        </Link>
      </section>

      {/* Signals — compact footer teaser at the very bottom of Home */}
      <section aria-label="About Signals" className="pt-2">
        <div className="flex items-center gap-3 rounded-[20px] border border-[#3B2758] bg-[#0B0714] px-4 py-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black border border-[#3B2758]"
          >
            <svg width="26" height="26" viewBox="0 0 120 120" aria-hidden="true">
              <g fill="none" strokeWidth="10" strokeLinecap="round">
                <path d="M21.8 53.8A54 54 0 0 1 98.2 53.8" stroke="#9B6CFF" />
                <path d="M33.1 65.1A38 38 0 0 1 86.9 65.1" stroke="#FF4FD8" />
                <path d="M44.4 76.4A22 22 0 0 1 75.6 76.4" stroke="#FFD60A" />
              </g>
              <circle cx="60" cy="92" r="9" fill="#22D3EE" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <strong className="text-sm font-extrabold text-[#F4F2FA]">
                Signals
              </strong>
              <span className="rounded-full bg-[#FFD60A] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#0B0A12]">
                COMING SOON
              </span>
            </div>
            <p className="text-xs text-[#9C97B0] leading-snug">
              Our upcoming campus app — find teammates, builders &amp; clubs
              without sharing phone numbers.
            </p>
          </div>
          <Link
            href="/signals/"
            className="shrink-0 rounded-xl bg-[#FFD60A] px-3 py-2 text-xs font-extrabold text-[#0B0A12] hover:bg-[#FFE14D]"
          >
            Open →
          </Link>
        </div>
      </section>
    </div>
  );
}
