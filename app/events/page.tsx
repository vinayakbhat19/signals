'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, CalendarSearch, Clock, ExternalLink, QrCode, Search, Share2, X } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_STYLES } from '@/components/category-chip';
import { EventCover } from '@/components/event-cover';
import { EventShareModal } from '@/components/event-share-modal';
import { useLiveFeed, type FeedEvent } from '@/lib/live-store';
import {
  formatDay,
  formatRange,
  formatTime,
  isLive,
  isUpNext,
  minutesUntil,
  toIstDateKey,
} from '@/lib/time';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

type StatusTab = 'all' | 'live' | 'soon' | 'done';
const VALID_TABS = new Set<StatusTab>(['all', 'live', 'soon', 'done']);
const VISIBLE_FILTER_CATEGORIES: readonly EventCategory[] = EVENT_CATEGORIES.filter(
  (c) => c !== 'sports' && c !== 'workshop' && c !== 'talk'
);
const VALID_CATEGORIES = new Set<string>(VISIBLE_FILTER_CATEGORIES);
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

function formatShortSoon(startsAt: string, now: Date): string {
  const mins = Math.max(0, minutesUntil(startsAt, now));
  if (mins <= 0) return 'STARTING NOW';
  if (mins < 60) return `COMING SOON · ${mins} MIN`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `COMING SOON · ${h} H ${m} M` : `COMING SOON · ${h} H`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'TOMORROW' : `IN ${d} DAYS`;
}

function EventsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { feed } = useLiveFeed();
  const [search, setSearch] = useState('');
  const [shareEvent, setShareEvent] = useState<FeedEvent | null>(null);

  const now = new Date(feed.server_time);
  const rawTab = searchParams.get('tab') as StatusTab | null;
  const activeTab: StatusTab = rawTab && VALID_TABS.has(rawTab) ? rawTab : 'all';

  const rawCat = searchParams.get('cat');
  const selectedCategories: EventCategory[] = rawCat
    ? rawCat
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is EventCategory => VALID_CATEGORIES.has(s))
    : [];

  function updateQuery(nextTab: StatusTab, nextCats: EventCategory[]) {
    const params = new URLSearchParams();
    if (nextTab !== 'all') params.set('tab', nextTab);
    if (nextCats.length > 0) params.set('cat', nextCats.join(','));
    const qs = params.toString();
    router.replace(qs ? `/events/?${qs}` : '/events/', { scroll: false });
  }

  function toggleCategory(cat: EventCategory) {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    updateQuery(activeTab, next);
  }

  const events = feed.events;
  const liveCount = events.filter((e) => isLive(e, now)).length;
  const normalizedQuery = search.trim().toLowerCase();

  const filtered = events.filter((event) => {
    const eventLive = isLive(event, now);
    const eventSoon = isUpNext(event, now);
    const eventDone =
      event.status === 'done' ||
      event.status === 'cancelled' ||
      (!eventLive && !eventSoon);

    if (activeTab === 'live' && !eventLive) return false;
    if (activeTab === 'soon' && !eventSoon) return false;
    if (activeTab === 'done' && !eventDone) return false;

    if (
      selectedCategories.length > 0 &&
      !selectedCategories.includes(event.category)
    ) {
      return false;
    }

    if (normalizedQuery) {
      const hay = [event.title, event.venue_name, event.host_name, event.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const dayMap = new Map<
    string,
    { dayKey: string; label: string; events: typeof filtered }
  >();
  for (const ev of filtered) {
    const dayKey = toIstDateKey(ev.starts_at);
    const existing = dayMap.get(dayKey);
    if (existing) existing.events.push(ev);
    else {
      dayMap.set(dayKey, {
        dayKey,
        label: formatDay(ev.starts_at).toUpperCase(),
        events: [ev],
      });
    }
  }
  const grouped = Array.from(dayMap.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey)
  );

  const tabs: { id: StatusTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'live', label: liveCount > 0 ? `Live (${liveCount})` : 'Live' },
    { id: 'soon', label: 'Soon' },
    { id: 'done', label: 'Done' },
  ];

  const hasFilters =
    activeTab !== 'all' || selectedCategories.length > 0 || normalizedQuery.length > 0;

  return (
    <div className="space-y-4">
      <header className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[36px] leading-none tracking-[-0.01em] text-[#F4F2FA]">
            EVENTS
          </h1>
          <Link
            href="/scan/"
            aria-label="Scan a QR"
            className="flex size-[46px] items-center justify-center rounded-[14px] bg-[#FFD60A] text-[#12091E]"
          >
            <QrCode className="size-6 stroke-[2.4]" />
          </Link>
        </div>

        <label className="relative flex h-[46px] items-center gap-2.5 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 focus-within:border-[#FFD60A]">
          <Search className="size-[18px] shrink-0 text-[#9C97B0]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, venues, hosts…"
            className="flex-1 bg-transparent text-[15px] text-[#F4F2FA] placeholder:text-[#9C97B0] outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="inline-flex size-8 items-center justify-center text-[#9C97B0] cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        <div
          role="tablist"
          className="grid grid-cols-4 gap-1 rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-1"
        >
          {tabs.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => updateQuery(tab.id, selectedCategories)}
                className={cn(
                  'h-[38px] rounded-[10px] text-[13px] transition-colors cursor-pointer',
                  selected
                    ? 'bg-[#FFD60A] font-extrabold text-[#12091E]'
                    : 'bg-transparent font-semibold text-[#BDB8CF]'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {VISIBLE_FILTER_CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] cursor-pointer',
                  active
                    ? CATEGORY_STYLES[cat]
                    : 'border-[#3B2758] bg-[#1F1230] text-[#BDB8CF]'
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                updateQuery('all', []);
              }}
              className="shrink-0 px-2 py-1.5 text-xs font-bold text-[#FFD60A] cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <a
          href={OFFICIAL_REGISTRATION_HUB}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-2.5 text-xs hover:border-[#5B3A86] transition-colors"
        >
          <span className="min-w-0 truncate font-bold text-[#F4F2FA]">
            Official Fiesta&apos;26 Registration Hub{' '}
            <span className="font-normal text-[#BDB8CF]">
              · linktr.ee/sdmcetFiesta26
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#FFD60A]/40 bg-[#FFD60A]/10 px-2.5 py-1 text-[11px] font-bold uppercase text-[#FFE866] hover:bg-[#FFD60A] hover:text-[#12091E] transition-colors">
            All Forms
            <ExternalLink className="size-3 opacity-75" />
          </span>
        </a>
      </header>

      {grouped.length > 0 ? (
        <div className="space-y-6 pt-1">
          {grouped.map((group) => (
            <section key={group.dayKey} className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#FFD60A]/40 bg-gradient-to-r from-[#2A1840] to-[#1F1230] px-4 py-2 shadow-sm">
                  <Calendar className="size-5 text-[#FFD60A] stroke-[2.5]" />
                  <h2 className="font-heading text-lg sm:text-xl font-black uppercase tracking-wide text-[#FFD60A]">
                    {group.label}
                  </h2>
                  <span className="rounded-lg bg-[#FFD60A]/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#FFE866] border border-[#FFD60A]/30">
                    Fest Day
                  </span>
                </div>
                <div className="h-0.5 flex-1 bg-gradient-to-r from-[#3B2758] to-transparent" />
              </div>
              <div className="grid gap-2.5 md:grid-cols-2">
                {group.events.map((event) => {
                  const eventLive = isLive(event, now);
                  const eventSoon = isUpNext(event, now);
                  const isCancelled = event.status === 'cancelled';
                  const isDone =
                    event.status === 'done' || isCancelled || (!eventLive && !eventSoon);
                  const regOpens = event.registration_opens_at
                    ? new Date(event.registration_opens_at)
                    : null;
                  const regCloses = event.registration_closes_at
                    ? new Date(event.registration_closes_at)
                    : null;
                  const regNotOpen = Boolean(regOpens && now < regOpens);
                  const regClosed = Boolean(regCloses && now > regCloses);
                  const registerHref = isSafeHttpUrl(event.registration_url)
                    ? event.registration_url
                    : OFFICIAL_REGISTRATION_HUB;

                  return (
                    <article
                      key={event.id}
                      className={cn(
                        'group flex flex-col justify-between gap-3 rounded-[22px] p-3 transition-all duration-200',
                        eventLive
                          ? 'border-2 border-[#FF4FD8] bg-[#1F1230]'
                          : isDone
                            ? 'border-[1.5px] border-dashed border-[#3A3549] bg-transparent opacity-80'
                            : 'border-[1.5px] border-[#34224F] bg-[#1F1230] hover:border-[#5B3A86] hover:bg-[#231538]'
                      )}
                    >
                      <Link href={`/event/?id=${event.id}`} className="flex gap-3">
                        <EventCover
                          title={event.title}
                          category={event.category}
                          coverUrl={event.cover_url}
                          variant="thumb"
                        />
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {eventLive && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF4FD8] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                                LIVE
                              </span>
                            )}
                            {!eventLive && eventSoon && (
                              <span className="rounded-full border border-[#FFD60A]/35 bg-[#FFD60A]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#FFE866]">
                                {formatShortSoon(event.starts_at, now)}
                              </span>
                            )}
                            {event.status === 'delayed' && (
                              <span className="rounded-full bg-[#FF9F43] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                                DELAYED
                              </span>
                            )}
                            {isCancelled && (
                              <span className="rounded-full bg-[#FF4FD8]/25 px-2 py-0.5 text-[10px] font-extrabold text-[#FF4FD8]">
                                CANCELLED
                              </span>
                            )}
                            <span className="rounded-full border border-[#3B2758] px-2 py-0.5 text-[10px] font-bold uppercase text-[#CFCBDD]">
                              {CATEGORY_LABELS[event.category]}
                            </span>
                          </div>
                          <h3
                            className={cn(
                              'font-heading text-[18px] sm:text-[19px] font-black leading-snug tracking-tight text-white line-clamp-2 group-hover:text-[#FFE866] transition-colors',
                              isCancelled && 'line-through text-[#9C97B0]'
                            )}
                          >
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#FFD60A]/50 bg-[#FFD60A]/20 px-2.5 py-1 text-xs sm:text-[13px] font-black tracking-tight text-[#FFD60A] shadow-sm">
                              <Calendar className="size-3.5 text-[#FFD60A] shrink-0 stroke-[2.5]" />
                              {formatDay(event.starts_at)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs sm:text-[13px] font-bold text-[#F4F2FA]">
                              <Clock className="size-3.5 text-[#FFD60A]/70 shrink-0" />
                              {formatRange(event.starts_at, event.ends_at)}
                            </span>
                            <span className="text-[#9C97B0] text-xs">·</span>
                            <span className="truncate text-xs font-semibold text-[#CFCBDD]">
                              {event.venue_name ?? 'Campus Venue (TBA)'}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2">
                        {eventSoon && !isCancelled && !regClosed ? (
                          regNotOpen && regOpens ? (
                            <div className="flex-1 flex min-h-9 items-center justify-center rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-semibold text-[#FFE866]">
                              Registration opens {formatTime(regOpens)} IST
                            </div>
                          ) : (
                            <a
                              href={registerHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#FFD60A]/35 bg-[#FFD60A]/10 px-4 text-xs font-bold uppercase tracking-[0.06em] text-[#FFE866] hover:bg-[#FFD60A] hover:text-[#12091E] hover:border-[#FFD60A] transition-colors duration-150"
                            >
                              <span>Register</span>
                              <ExternalLink className="size-3.5 opacity-70" />
                            </a>
                          )
                        ) : (
                          <Link
                            href={`/event/?id=${event.id}`}
                            className="flex-1 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#140A22] px-3 text-xs font-bold text-[#CFCBDD] hover:border-[#5B3A86] hover:text-white transition-colors"
                          >
                            <span>View Details</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setShareEvent(event)}
                          aria-label={`Share ${event.title} card`}
                          title="Share event card & QR"
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#3B2758] bg-[#140A22] text-[#BDB8CF] hover:border-[#FFD60A]/50 hover:text-[#FFE866] transition-colors cursor-pointer"
                        >
                          <Share2 className="size-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[22px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/50 px-6 py-12 text-center">
          <CalendarSearch className="mb-3 size-7 text-[#9C97B0]" />
          <h3 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            No events found
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[#9C97B0]">
            Try switching tabs or clearing your search filters.
          </p>
        </div>
      )}

      {shareEvent && (
        <EventShareModal
          isOpen={Boolean(shareEvent)}
          onClose={() => setShareEvent(null)}
          event={shareEvent}
          venueName={shareEvent.venue_name}
        />
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-[#9C97B0]">Loading events…</div>}>
      <EventsInner />
    </Suspense>
  );
}
