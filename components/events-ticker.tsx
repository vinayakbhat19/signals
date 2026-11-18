'use client';

import Link from 'next/link';
import { formatDay, formatTime } from '@/lib/time';
import type { FeedChange, FeedEvent } from '@/lib/live-store';

interface EventsTickerProps {
  events: FeedEvent[];
  changes?: FeedChange[];
}

interface TickerItem {
  key: string;
  href: string;
  label: string;
}

export function EventsTicker({ events, changes = [] }: EventsTickerProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const items: TickerItem[] = [
    ...changes.slice(0, 4).map((c) => ({
      key: `change-${c.id}`,
      href: c.event_id ? `/event/?id=${c.event_id}` : '/updates/',
      label: c.message,
    })),
    ...sortedEvents.map((ev) => {
      const day = formatDay(ev.starts_at).replace(/^[A-Za-z]+,\s*/, '');
      const time = formatTime(ev.starts_at);
      const venue =
        ev.venue_name && !/tba/i.test(ev.venue_name)
          ? ` · ${ev.venue_name}`
          : '';
      return {
        key: `ev-${ev.id}`,
        href: `/event/?id=${ev.id}`,
        label: `${ev.title} · ${day} · ${time}${venue}`,
      };
    }),
  ];

  if (items.length === 0) return null;

  // ~3.2s per item gives a smooth, comfortable reading pace across all 21 events
  const durationSec = Math.max(24, Math.round(items.length * 3.2));

  return (
    <div
      aria-label="Live event timings ticker"
      className="-mx-4 lg:-mx-5"
      style={{
        overflowX: 'clip',
        overflowY: 'visible',
        paddingTop: '14px',
        paddingBottom: '14px',
      }}
    >
      <div
        style={{
          width: '108%',
          marginLeft: '-4%',
          transform: 'rotate(-1.8deg)',
          backgroundColor: '#FFD60A',
          color: '#0B0A12',
          paddingTop: '11px',
          paddingBottom: '11px',
          boxShadow: '0 8px 22px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          className="ticker-track inline-flex w-max items-center hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {[0, 1].map((dup) => (
            <div
              key={dup}
              aria-hidden={dup === 1 || undefined}
              className="flex shrink-0 items-center"
            >
              {items.map((item) => (
                <span
                  key={`${dup}-${item.key}`}
                  className="inline-flex items-center"
                >
                  <Link
                    href={item.href}
                    tabIndex={dup === 1 ? -1 : undefined}
                    className="whitespace-nowrap px-3 font-heading text-[13px] font-extrabold uppercase tracking-[0.06em] hover:underline"
                    style={{ color: '#0B0A12' }}
                  >
                    {item.label}
                  </Link>
                  <span
                    aria-hidden="true"
                    className="px-2 text-sm leading-none"
                    style={{ color: '#0B0A12' }}
                  >
                    ✦
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
