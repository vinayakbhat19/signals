import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { EventCard } from '@/components/event-card';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { listEventsByVenue } from '@/lib/data/events';
import { getVenue, listVenues } from '@/lib/data/venues';
import { formatDay, isLive, toIstDateKey } from '@/lib/time';
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
    const venues = await listVenues();
    return venues.map((venue) => ({ id: venue.id }));
  } catch (error) {
    console.error('[venues/[id]] generateStaticParams failed:', error);
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
    const venue = await getVenue(id);
    if (!venue) return { title: 'Venue not found' };
    return {
      title: venue.name,
      description:
        venue.description ?? `Events happening at ${venue.name}.`,
    };
  } catch {
    return { title: 'Venue details' };
  }
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getVenue(id);

  if (!venue) {
    notFound();
  }

  const events = await listEventsByVenue(venue.id);
  const now = new Date();
  const todayKey = toIstDateKey(now);

  const todaysEvents = events.filter(
    (event) => toIstDateKey(event.starts_at) === todayKey
  );
  const upcomingOtherDays = events.filter(
    (event) => toIstDateKey(event.starts_at) > todayKey
  );
  const earlierDays = events.filter(
    (event) => toIstDateKey(event.starts_at) < todayKey
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/venues"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All venues
        </Link>
      </div>

      <PageHeader
        title={venue.name}
        subtitle={venue.description ?? undefined}
        action={
          isSafeHttpUrl(venue.maps_url) ? (
            <a
              href={venue.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: 'default' }),
                'min-h-11 gap-2 px-4'
              )}
            >
              <MapPin className="size-4" aria-hidden="true" />
              Open in Google Maps
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : undefined
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-5" aria-hidden="true" />}
          title="No events scheduled here"
          description="Check back later or browse the full schedule for events at other venues."
          actionLabel="View full schedule"
          actionHref="/schedule"
        />
      ) : (
        <div className="space-y-7">
          {todaysEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold tracking-tight">
                Today ({formatDay(now)})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {todaysEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    live={isLive(event, now)}
                  />
                ))}
              </div>
            </section>
          )}

          {upcomingOtherDays.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold tracking-tight">
                Upcoming days
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {upcomingOtherDays.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    timeNote={formatDay(event.starts_at)}
                  />
                ))}
              </div>
            </section>
          )}

          {todaysEvents.length === 0 &&
            upcomingOtherDays.length === 0 &&
            earlierDays.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-base font-bold tracking-tight">
                  Previous events at this venue
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {earlierDays.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      timeNote={formatDay(event.starts_at)}
                    />
                  ))}
                </div>
              </section>
            )}
        </div>
      )}
    </div>
  );
}
