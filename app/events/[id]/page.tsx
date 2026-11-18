import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Trophy,
} from 'lucide-react';
import { CategoryChip } from '@/components/category-chip';
import { EventActions } from '@/components/event-actions';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEvent, listEvents } from '@/lib/data/events';
import {
  formatDay,
  formatRange,
  formatTime,
  isLive,
  toGoogleCalendarUtc,
} from '@/lib/time';
import { cn } from '@/lib/utils';

export const revalidate = 30;
export const dynamicParams = true;

function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
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
    if (!event) {
      return { title: 'Event not found' };
    }
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
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  const now = new Date();
  const live = isLive(event, now);
  const isCancelled = event.status === 'cancelled';

  const dayStr = formatDay(event.starts_at);
  const rangeStr = formatRange(event.starts_at, event.ends_at);
  const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';

  const gcalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.title} (${festName})`,
    dates: `${toGoogleCalendarUtc(event.starts_at)}/${toGoogleCalendarUtc(event.ends_at)}`,
    details: event.description ?? `${event.title} at ${festName}`,
    location: event.venue_name ?? '',
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;

  const shareText = `${event.title} — ${dayStr}, ${rangeStr} IST${event.venue_name ? ` at ${event.venue_name}` : ''}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/schedule"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to schedule
        </Link>
      </div>

      {/* Header block */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/80 dark:text-red-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-600 dark:bg-red-400" />
              </span>
              LIVE NOW
            </span>
          )}
          <CategoryChip category={event.category} />
          <StatusBadge status={event.status} />
        </div>

        <h1
          className={cn(
            'text-2xl font-bold tracking-tight sm:text-3xl',
            isCancelled && 'line-through text-muted-foreground'
          )}
        >
          {event.title}
        </h1>
      </div>

      {/* Key metadata card */}
      <Card>
        <CardContent className="space-y-3 pt-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Calendar
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-foreground">{dayStr}</p>
              <p className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {rangeStr} IST
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center gap-2">
              {event.venue ? (
                <Link
                  href={`/venues/${event.venue.id}`}
                  className="font-medium text-brand hover:underline underline-offset-4"
                >
                  {event.venue.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">Venue TBA</span>
              )}
              {isSafeHttpUrl(event.venue?.maps_url) && (
                <a
                  href={event.venue.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Open in Maps
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {event.contact_info && (
            <div className="flex items-start gap-2.5">
              <Phone
                className="mt-0.5 size-4 shrink-0 text-brand"
                aria-hidden="true"
              />
              <div>
                <span className="text-muted-foreground">Contact: </span>
                <span className="font-medium text-foreground">
                  {event.contact_info}
                </span>
              </div>
            </div>
          )}

          {isSafeHttpUrl(event.registration_url) && (
            <div className="pt-2">
              <a
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'min-h-11 gap-2 px-4'
                )}
              >
                Register for this event
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {event.description && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">About this event</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {event.description}
          </p>
        </section>
      )}

      {/* Results block if present */}
      {event.results.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Trophy className="size-4 text-brand" aria-hidden="true" />
            Results & Scores
          </h2>
          {event.results.map((result) => (
            <Card key={result.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {result.is_live && (
                      <Badge variant="destructive" className="text-[11px]">
                        LIVE
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Updated {formatTime(result.updated_at)} IST
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {result.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Actions */}
      <section className="space-y-2 border-t pt-5">
        <EventActions
          eventId={event.id}
          eventTitle={event.title}
          shareText={shareText}
          googleCalendarUrl={googleCalendarUrl}
        />
      </section>
    </div>
  );
}
