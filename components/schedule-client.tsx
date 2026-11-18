'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarSearch, Clock, Search, X } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_STYLES } from '@/components/category-chip';
import { EmptyState } from '@/components/empty-state';
import { EventCard } from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EventWithVenue } from '@/lib/data/events';
import {
  formatDay,
  formatHourLabel,
  isLive,
  isUpNext,
  toIstDateKey,
  toIstHourKey,
} from '@/lib/time';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const VALID_CATEGORIES = new Set<string>(EVENT_CATEGORIES);

interface ScheduleClientProps {
  events: EventWithVenue[];
  serverTime: string;
}

export function ScheduleClient({ events, serverTime }: ScheduleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');

  const days = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      const key = toIstDateKey(event.starts_at);
      if (!map.has(key)) {
        map.set(key, formatDay(event.starts_at));
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));
  }, [events]);

  const todayKey = toIstDateKey(serverTime);
  const defaultDayKey = useMemo(() => {
    if (days.some((d) => d.key === todayKey)) return todayKey;
    return days[0]?.key ?? todayKey;
  }, [days, todayKey]);

  const dayParam = searchParams.get('day');
  const activeDay =
    dayParam && days.some((d) => d.key === dayParam) ? dayParam : defaultDayKey;

  const selectedCategories = useMemo<EventCategory[]>(() => {
    const raw = searchParams.get('cat');
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is EventCategory => VALID_CATEGORIES.has(s));
  }, [searchParams]);

  function updateQuery(nextDay: string, nextCats: EventCategory[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextDay && nextDay !== defaultDayKey) {
      params.set('day', nextDay);
    } else {
      params.delete('day');
    }
    if (nextCats.length > 0) {
      params.set('cat', nextCats.join(','));
    } else {
      params.delete('cat');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleCategory(category: EventCategory) {
    const exists = selectedCategories.includes(category);
    const nextCats = exists
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    updateQuery(activeDay, nextCats);
  }

  function clearFilters() {
    setSearch('');
    updateQuery(activeDay, []);
  }

  const normalizedQuery = search.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (days.length > 0 && toIstDateKey(event.starts_at) !== activeDay) {
        return false;
      }
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(event.category)
      ) {
        return false;
      }
      if (normalizedQuery) {
        const titleMatch = event.title.toLowerCase().includes(normalizedQuery);
        const venueMatch = (event.venue_name ?? '')
          .toLowerCase()
          .includes(normalizedQuery);
        if (!titleMatch && !venueMatch) return false;
      }
      return true;
    });
  }, [events, days.length, activeDay, selectedCategories, normalizedQuery]);

  const groupedByHour = useMemo(() => {
    const groups = new Map<
      string,
      { hourKey: string; hourLabel: string; events: EventWithVenue[] }
    >();

    for (const event of filteredEvents) {
      const hourKey = toIstHourKey(event.starts_at);
      const existing = groups.get(hourKey);
      if (existing) {
        existing.events.push(event);
      } else {
        groups.set(hourKey, {
          hourKey,
          hourLabel: formatHourLabel(event.starts_at),
          events: [event],
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.hourKey.localeCompare(b.hourKey)
    );
  }, [filteredEvents]);

  const nowEventId = useMemo(() => {
    const now = new Date();
    const firstLive = filteredEvents.find((e) => isLive(e, now));
    if (firstLive) return firstLive.id;
    const firstNext = filteredEvents.find((e) => isUpNext(e, now));
    return firstNext?.id ?? null;
  }, [filteredEvents]);

  function handleJumpToNow() {
    if (days.some((d) => d.key === todayKey) && activeDay !== todayKey) {
      updateQuery(todayKey, selectedCategories);
      window.setTimeout(() => {
        document
          .getElementById('schedule-now-anchor')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    const target = document.getElementById('schedule-now-anchor');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const hasFilters = selectedCategories.length > 0 || normalizedQuery.length > 0;
  const nowDate = new Date(serverTime);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarSearch className="size-5" aria-hidden="true" />}
        title="Schedule not published yet"
        description="Events will appear here as soon as the fest committee publishes the schedule."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Day tabs (only when multiple days have events) + Jump to now */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {days.length > 1 ? (
          <div
            role="tablist"
            aria-label="Fest days"
            className="flex flex-wrap gap-1.5"
          >
            {days.map((day) => {
              const selected = day.key === activeDay;
              return (
                <button
                  key={day.key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => updateQuery(day.key, selectedCategories)}
                  className={cn(
                    'min-h-11 rounded-lg border px-3.5 text-sm font-medium transition-colors cursor-pointer',
                    selected
                      ? 'border-brand bg-brand text-brand-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  {day.label}
                  {day.key === todayKey ? ' (Today)' : ''}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            {days[0]?.label}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={handleJumpToNow}
          disabled={!nowEventId && activeDay === todayKey}
          className="min-h-11 gap-1.5 px-3.5 text-xs font-medium"
        >
          <Clock className="size-3.5 text-brand" aria-hidden="true" />
          Jump to now
        </Button>
      </div>

      {/* Search box */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events or venues…"
          aria-label="Search events or venues"
          className="h-11 pl-10 pr-10 text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category filter chips (multi-select) */}
      <div
        role="group"
        aria-label="Filter by category"
        className="flex flex-wrap items-center gap-2"
      >
        {EVENT_CATEGORIES.map((category) => {
          const active = selectedCategories.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => toggleCategory(category)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-xs font-medium transition-all cursor-pointer',
                active
                  ? cn(
                      CATEGORY_STYLES[category],
                      'ring-2 ring-brand/60 ring-offset-1 ring-offset-background font-semibold'
                    )
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-9 px-2 text-xs font-medium text-brand hover:underline underline-offset-4 cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Grouped events */}
      {groupedByHour.length > 0 ? (
        <div className="space-y-6">
          {groupedByHour.map((group) => (
            <section
              key={group.hourKey}
              aria-label={group.hourLabel}
              className="space-y-2.5"
            >
              <h2 className="sticky top-14 z-10 -mx-1 bg-background/95 px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-xs">
                {group.hourLabel}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.events.map((event) => {
                  const isAnchor = event.id === nowEventId;
                  return (
                    <div
                      key={event.id}
                      id={isAnchor ? 'schedule-now-anchor' : undefined}
                    >
                      <EventCard
                        event={event}
                        live={isLive(event, nowDate)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarSearch className="size-5" aria-hidden="true" />}
          title="No matching events"
          description="Try clearing a category filter or searching for a different title or venue."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      )}
    </div>
  );
}
