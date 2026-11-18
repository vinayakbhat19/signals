import Link from 'next/link';
import { Clock, MapPin, Star } from 'lucide-react';
import { CategoryChip } from '@/components/category-chip';
import { StatusBadge } from '@/components/status-badge';
import { formatRange } from '@/lib/time';
import type { EventCategory, EventStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface EventCardData {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  venue_name?: string | null;
}

interface EventCardProps {
  event: EventCardData;
  /** Show pulsing LIVE indicator */
  live?: boolean;
  /** Optional extra note beside the time, e.g. "in 25 min" or "ends 5:30 PM" */
  timeNote?: string;
  /** Whether to show StatusBadge even when status is 'scheduled' */
  showScheduledStatus?: boolean;
  /** Star button state/placeholder */
  starred?: boolean;
  onToggleStar?: (eventId: string) => void;
  /** Custom star slot (used in Phase 4 when real star toggle is wired up) */
  starSlot?: React.ReactNode;
  /** Optional href override (defaults to /events/[id]) */
  href?: string;
  className?: string;
}

export function EventCard({
  event,
  live = false,
  timeNote,
  showScheduledStatus = false,
  starred = false,
  onToggleStar,
  starSlot,
  href,
  className,
}: EventCardProps) {
  const isCancelled = event.status === 'cancelled';
  const targetHref = href ?? `/events/${event.id}`;

  return (
    <article
      className={cn(
        'group relative flex items-stretch justify-between gap-2 rounded-xl border bg-card p-3.5 text-card-foreground shadow-xs transition-colors hover:border-brand/50',
        isCancelled && 'opacity-70',
        live && 'border-brand/50 ring-1 ring-brand/20',
        className
      )}
    >
      <Link
        href={targetHref}
        className="flex min-w-0 flex-1 flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950/80 dark:text-red-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-600 dark:bg-red-400" />
              </span>
              LIVE
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {formatRange(event.starts_at, event.ends_at)}
          </span>
          {timeNote && (
            <span className="font-medium text-brand">{timeNote}</span>
          )}
        </div>

        <h3
          className={cn(
            'text-base font-semibold leading-snug text-foreground group-hover:text-brand transition-colors',
            isCancelled && 'line-through text-muted-foreground'
          )}
        >
          {event.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={event.category} />
          {(showScheduledStatus || event.status !== 'scheduled') && (
            <StatusBadge status={event.status} />
          )}
          {event.venue_name && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[180px]">{event.venue_name}</span>
            </span>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 items-start">
        {starSlot ?? (
          <button
            type="button"
            onClick={onToggleStar ? () => onToggleStar(event.id) : undefined}
            aria-label={starred ? `Unstar ${event.title}` : `Star ${event.title}`}
            aria-pressed={starred}
            disabled={!onToggleStar}
            title={onToggleStar ? undefined : 'Starring unlocks in Phase 4'}
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors',
              onToggleStar
                ? 'hover:bg-accent hover:text-foreground cursor-pointer'
                : 'opacity-50 cursor-default',
              starred && 'text-amber-500 dark:text-amber-400'
            )}
          >
            <Star
              className={cn('size-5', starred && 'fill-current')}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </article>
  );
}
