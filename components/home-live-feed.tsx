'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  MapPin,
  Megaphone,
  Radio,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react';
import { EventCard } from '@/components/event-card';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import type { LiveData } from '@/lib/data/live';
import { formatCountdown, formatTime, formatTimeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';

const DISMISSED_URGENT_KEY = 'fest-live:dismissed-urgent-id';

const urgentListeners = new Set<() => void>();

function subscribeUrgentDismissal(callback: () => void) {
  urgentListeners.add(callback);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback);
  }
  return () => {
    urgentListeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', callback);
    }
  };
}

function getDismissedUrgentSnapshot(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_URGENT_KEY);
  } catch {
    return null;
  }
}

function getDismissedUrgentServerSnapshot(): string | null {
  return null;
}

const QUICK_LINKS = [
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/venues', label: 'Venues', icon: MapPin },
  { href: '/results', label: 'Results', icon: Trophy },
  { href: '/signals', label: 'Signals', icon: Radio },
] as const;

async function fetchLive(url: string): Promise<LiveData> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Live API returned ${res.status}`);
  }
  return res.json() as Promise<LiveData>;
}

interface HomeLiveFeedProps {
  festName: string;
  collegeName: string;
  initialData: LiveData;
}

export function HomeLiveFeed({
  festName,
  collegeName,
  initialData,
}: HomeLiveFeedProps) {
  const { data, error, isValidating, mutate } = useSWR<LiveData>(
    '/api/live',
    fetchLive,
    {
      fallbackData: initialData,
      refreshInterval: 20_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
      shouldRetryOnError: true,
      errorRetryInterval: 15_000,
    }
  );

  const liveData = data ?? initialData;

  // Keep client "now" anchored to serverTime + elapsed ms so wrong phone clocks don't break countdowns
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

  // Urgent banner dismissal persisted in localStorage (safe in private mode)
  const dismissedUrgentId = useSyncExternalStore(
    subscribeUrgentDismissal,
    getDismissedUrgentSnapshot,
    getDismissedUrgentServerSnapshot
  );

  function dismissUrgent(id: string) {
    try {
      window.localStorage.setItem(DISMISSED_URGENT_KEY, id);
    } catch {
      // Ignore storage errors (private browsing / restricted webview)
    }
    urgentListeners.forEach((listener) => listener());
  }

  const urgentBanner =
    liveData.urgent && liveData.urgent.id !== dismissedUrgentId
      ? liveData.urgent
      : null;
  const nextEvent = liveData.next[0] ?? null;

  return (
    <div className="space-y-7">
      {urgentBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-950 shadow-xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold uppercase tracking-wide text-[11px] text-amber-800 dark:text-amber-200">
                  Urgent update
                </span>
                <span className="text-xs text-amber-800/80 dark:text-amber-200/80">
                  {formatTimeAgo(urgentBanner.created_at, syncedNow)}
                </span>
              </div>
              <p className="leading-snug">{urgentBanner.message}</p>
              {urgentBanner.event_id && (
                <Link
                  href={`/events/${urgentBanner.event_id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
                >
                  {urgentBanner.event_title ?? 'View event'}
                  <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => dismissUrgent(urgentBanner.id)}
            aria-label="Dismiss urgent announcement"
            className="size-10 shrink-0 text-amber-900 hover:bg-amber-200/60 dark:text-amber-100 dark:hover:bg-amber-900/60"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <PageHeader
        title={festName}
        subtitle={collegeName}
        action={
          error ? (
            <button
              type="button"
              onClick={() => void mutate()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 cursor-pointer"
            >
              <RefreshCw
                className={cn('size-3.5', isValidating && 'animate-spin')}
                aria-hidden="true"
              />
              Updating…
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" />
              Live · {formatTime(syncedNow)} IST
            </span>
          )
        }
      />

      {/* Quick links */}
      <section aria-label="Quick links" className="grid grid-cols-4 gap-2">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-auto min-h-14 flex-col gap-1.5 px-2 py-2.5 text-xs font-medium'
              )}
            >
              <Icon className="size-4 text-brand" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </section>

      {/* Happening now */}
      <section aria-labelledby="heading-now" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="heading-now"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="relative flex size-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
            </span>
            Happening now
          </h2>
          <Link
            href="/schedule"
            className="text-xs font-medium text-brand hover:underline underline-offset-4 min-h-9 inline-flex items-center"
          >
            Full schedule
          </Link>
        </div>

        {liveData.now.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {liveData.now.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                live
                timeNote={`ends ${formatTime(event.ends_at)}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing live right now"
            description={
              nextEvent
                ? `Next up: ${nextEvent.title} at ${formatTime(nextEvent.starts_at)}${nextEvent.venue_name ? ` (${nextEvent.venue_name})` : ''}.`
                : 'Check the full schedule to plan your day.'
            }
            actionLabel={nextEvent ? 'View next event' : 'Browse schedule'}
            actionHref={nextEvent ? `/events/${nextEvent.id}` : '/schedule'}
          />
        )}
      </section>

      {/* Up next */}
      <section aria-labelledby="heading-next" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="heading-next" className="text-lg font-bold tracking-tight">
            Up next
          </h2>
          <Link
            href="/schedule"
            className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-brand hover:underline underline-offset-4"
          >
            See all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {liveData.next.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {liveData.next.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                timeNote={formatCountdown(event.starts_at, syncedNow)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No more upcoming events"
            description="All scheduled events have finished or been updated. Check Results for winners and scores."
            actionLabel="View results"
            actionHref="/results"
          />
        )}
      </section>

      {/* Latest announcements */}
      <section aria-labelledby="heading-announcements" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="heading-announcements"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <Megaphone className="size-4 text-brand" aria-hidden="true" />
            Latest announcements
          </h2>
          <Link
            href="/announcements"
            className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-brand hover:underline underline-offset-4"
          >
            See all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {liveData.announcements.length > 0 ? (
          <div className="space-y-2.5">
            {liveData.announcements.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border bg-card p-3.5 text-card-foreground shadow-xs"
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {item.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-[11px]">
                        Urgent
                      </Badge>
                    )}
                    {item.event_id && (
                      <Link
                        href={`/events/${item.event_id}`}
                        className="font-medium text-brand hover:underline underline-offset-4"
                      >
                        {item.event_title ?? 'Linked event'}
                      </Link>
                    )}
                  </div>
                  <span>{formatTimeAgo(item.created_at, syncedNow)}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {item.message}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Megaphone className="size-5" aria-hidden="true" />}
            title="No announcements yet"
            description="Live committee updates and room changes will appear here automatically."
          />
        )}
      </section>
    </div>
  );
}
