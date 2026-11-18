'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarSearch, QrCode, Search, X } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_STYLES } from '@/components/category-chip';
import { EventCover } from '@/components/event-cover';
import type { EventWithVenue } from '@/lib/data/events';
import {
  formatDay,
  formatRange,
  isLive,
  isUpNext,
  minutesUntil,
  toIstDateKey,
} from '@/lib/time';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

type StatusTab = 'all' | 'live' | 'soon' | 'done';

const VALID_TABS = new Set<StatusTab>(['all', 'live', 'soon', 'done']);
const VALID_CATEGORIES = new Set<string>(EVENT_CATEGORIES);

function formatShortSoon(startsAt: string, now: Date): string {
  const mins = Math.max(0, minutesUntil(startsAt, now));
  if (mins <= 0) return 'STARTING NOW';
  if (mins < 60) return `COMING SOON · ${mins} MIN`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) {
    return m > 0 ? `COMING SOON · ${h} H ${m} M` : `COMING SOON · ${h} H`;
  }
  const d = Math.floor(h / 24);
  return d === 1 ? 'TOMORROW' : `IN ${d} DAYS`;
}

interface EventsClientProps {
  events: EventWithVenue[];
  serverTime: string;
}

export function EventsClient({ events, serverTime }: EventsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');

  const rawTab = searchParams.get('tab') as StatusTab | null;
  const activeTab: StatusTab =
    rawTab && VALID_TABS.has(rawTab) ? rawTab : 'all';

  const rawCat = searchParams.get('cat');
  const selectedCategories: EventCategory[] = rawCat
    ? rawCat
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is EventCategory => VALID_CATEGORIES.has(s))
    : [];

  function updateQuery(nextTab: StatusTab, nextCats: EventCategory[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab !== 'all') {
      params.set('tab', nextTab);
    } else {
      params.delete('tab');
    }
    if (nextCats.length > 0) {
      params.set('cat', nextCats.join(','));
    } else {
      params.delete('cat');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleCategory(cat: EventCategory) {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    updateQuery(activeTab, next);
  }

  const liveCount = events.filter((e) => isLive(e, serverTime)).length;

  const normalizedQuery = search.trim().toLowerCase();

  const filteredEvents = events.filter((event) => {
    const eventLive = isLive(event, serverTime);
    const eventSoon = isUpNext(event, serverTime);
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
      const haystack = [
        event.title,
        event.venue_name,
        event.host_name,
        event.contact_info,
        event.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });

  const dayMap = new Map<
    string,
    { dayKey: string; label: string; events: EventWithVenue[] }
  >();
  for (const event of filteredEvents) {
    const dayKey = toIstDateKey(event.starts_at);
    const existing = dayMap.get(dayKey);
    if (existing) {
      existing.events.push(event);
    } else {
      dayMap.set(dayKey, {
        dayKey,
        label: formatDay(event.starts_at).toUpperCase(),
        events: [event],
      });
    }
  }
  const groupedByDay = Array.from(dayMap.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey)
  );

  const tabs: { id: StatusTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'live', label: liveCount > 0 ? `Live (${liveCount})` : 'Live' },
    { id: 'soon', label: 'Soon' },
    { id: 'done', label: 'Done' },
  ];

  const hasFilters =
    activeTab !== 'all' ||
    selectedCategories.length > 0 ||
    normalizedQuery.length > 0;

  return (
    <div className="space-y-4">
      {/* Header matching 11-events.png */}
      <header className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#F4F2FA]">
            Events
          </h1>
          <Link
            href="/scan"
            aria-label="Scan a QR"
            className="flex size-[46px] items-center justify-center rounded-[14px] bg-[#C6FF3D] text-[#0B0A12] transition-transform active:translate-y-0.5"
          >
            <QrCode className="size-6 stroke-[2.4]" aria-hidden="true" />
          </Link>
        </div>

        {/* Search */}
        <label className="relative flex h-[46px] items-center gap-2.5 rounded-[16px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-3.5 focus-within:border-[#C6FF3D]">
          <Search
            className="size-[18px] shrink-0 text-[#9C97B0]"
            aria-hidden="true"
          />
          <span className="sr-only">Search events, venues or hosts</span>
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
              className="inline-flex size-8 items-center justify-center rounded-lg text-[#9C97B0] hover:text-[#F4F2FA] cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>

        {/* Segmented tabs: All / Live (N) / Soon / Done */}
        <div
          role="tablist"
          aria-label="Filter by status"
          className="grid grid-cols-4 gap-1 rounded-[14px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-1"
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
                    ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
                    : 'bg-transparent font-semibold text-[#BDB8CF] hover:text-[#F4F2FA]'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Category chips */}
        <div
          role="group"
          aria-label="Filter by category"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        >
          {EVENT_CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] transition-all cursor-pointer',
                  active
                    ? CATEGORY_STYLES[cat]
                    : 'border-[#2E2A3D] bg-[#16141F] text-[#BDB8CF] hover:border-[#9C97B0]'
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
              className="shrink-0 px-2 py-1.5 text-xs font-bold text-[#C6FF3D] cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* Event list grouped by day */}
      {groupedByDay.length > 0 ? (
        <div className="space-y-6 pt-1">
          {groupedByDay.map((group) => (
            <section key={group.dayKey} className="space-y-2.5">
              <h2 className="px-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[#9C97B0]">
                {group.label} · FEST DAY
              </h2>

              <div className="grid gap-2.5 md:grid-cols-2">
                {group.events.map((event) => {
                  const eventLive = isLive(event, serverTime);
                  const eventSoon = isUpNext(event, serverTime);
                  const isCancelled = event.status === 'cancelled';
                  const isDone =
                    event.status === 'done' ||
                    isCancelled ||
                    (!eventLive && !eventSoon);
                  const hostLabel = event.host_name || event.contact_info;

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={cn(
                        'flex gap-3 rounded-[22px] p-2.5 transition-colors',
                        eventLive
                          ? 'border-2 border-[#FF4FA3] bg-[#16141F]'
                          : isDone
                            ? 'border-[1.5px] border-dashed border-[#3A3549] bg-transparent opacity-80 hover:opacity-100'
                            : 'border-[1.5px] border-[#2E2A3D] bg-[#16141F] hover:border-[#C6FF3D]/60'
                      )}
                    >
                      <EventCover
                        title={event.title}
                        category={event.category}
                        coverUrl={event.cover_url}
                        variant="thumb"
                      />

                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {eventLive && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4FA3] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0A12]">
                              <span className="live-dot size-1.5 rounded-full bg-[#0B0A12]" />
                              LIVE
                            </span>
                          )}
                          {!eventLive && eventSoon && (
                            <span className="rounded-full bg-[#FFE14D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0A12]">
                              {formatShortSoon(event.starts_at, new Date(serverTime))}
                            </span>
                          )}
                          {event.status === 'delayed' && (
                            <span className="rounded-full bg-[#FF9F43] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0A12]">
                              DELAYED
                            </span>
                          )}
                          {isCancelled && (
                            <span className="rounded-full bg-[#FF4FA3]/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#FF4FA3]">
                              CANCELLED
                            </span>
                          )}
                          {!eventLive && !eventSoon && !isCancelled && (
                            <span className="rounded-full bg-[#3A3549] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#F4F2FA]">
                              DONE
                            </span>
                          )}
                          <span className="rounded-full border border-[#2E2A3D] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#CFCBDD]">
                            {CATEGORY_LABELS[event.category]}
                          </span>
                        </div>

                        <span
                          className={cn(
                            'truncate text-[16px] font-extrabold leading-snug text-[#F4F2FA]',
                            isCancelled && 'line-through text-[#9C97B0]'
                          )}
                        >
                          {event.title}
                        </span>

                        <span className="truncate text-xs text-[#CFCBDD]">
                          {formatRange(event.starts_at, event.ends_at)} ·{' '}
                          {event.venue_name ?? 'Venue TBA'}
                        </span>

                        {hostLabel && (
                          <span className="truncate text-xs text-[#9C97B0]">
                            Hosted by {hostLabel}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[22px] border-[1.5px] border-dashed border-[#2E2A3D] bg-[#16141F]/50 px-6 py-12 text-center">
          <CalendarSearch
            className="mb-3 size-7 text-[#9C97B0]"
            aria-hidden="true"
          />
          <h3 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            No events found
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[#9C97B0]">
            Try switching tabs or clearing your search and category filters.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                updateQuery('all', []);
              }}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#C6FF3D] px-4 text-sm font-extrabold text-[#0B0A12] cursor-pointer"
            >
              Show all events
            </button>
          )}
        </div>
      )}
    </div>
  );
}
