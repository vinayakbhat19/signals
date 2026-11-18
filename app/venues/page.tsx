import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { listEvents, type EventWithVenue } from '@/lib/data/events';
import { listVenues } from '@/lib/data/venues';
import type { Venue } from '@/lib/types';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Venues',
  description: 'Campus venues, event counts, and Google Maps directions.',
};

function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function VenuesPage() {
  let venues: Venue[] = [];
  let events: EventWithVenue[] = [];

  try {
    [venues, events] = await Promise.all([listVenues(), listEvents()]);
  } catch (error) {
    console.error('[app/venues] Failed to load venues:', error);
  }

  const eventCounts = new Map<string, number>();
  for (const event of events) {
    if (event.venue_id && event.status !== 'cancelled') {
      eventCounts.set(event.venue_id, (eventCounts.get(event.venue_id) ?? 0) + 1);
    }
  }

  const hasCampusMap = fs.existsSync(
    path.join(process.cwd(), 'public', 'campus-map.jpg')
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Venues"
        subtitle="Tap a venue to see its schedule and directions."
      />

      {hasCampusMap && (
        <section aria-label="Campus map" className="overflow-hidden rounded-xl border bg-card">
          <Image
            src="/campus-map.jpg"
            alt="Campus map"
            width={1200}
            height={800}
            className="h-auto w-full object-cover"
            priority={false}
          />
        </section>
      )}

      {venues.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {venues.map((venue) => {
            const count = eventCounts.get(venue.id) ?? 0;
            return (
              <Card
                key={venue.id}
                className="transition-colors hover:ring-brand/50"
              >
                <CardContent className="flex flex-col justify-between gap-3 pt-4">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="group flex items-start justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                  >
                    <div className="min-w-0 space-y-1">
                      <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground group-hover:text-brand transition-colors">
                        <MapPin
                          className="size-4 shrink-0 text-brand"
                          aria-hidden="true"
                        />
                        <span className="truncate">{venue.name}</span>
                      </h2>
                      {venue.description && (
                        <p className="text-sm text-muted-foreground">
                          {venue.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </Link>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Badge variant="secondary">
                      {count} {count === 1 ? 'event' : 'events'}
                    </Badge>
                    {isSafeHttpUrl(venue.maps_url) && (
                      <a
                        href={venue.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-brand hover:underline underline-offset-4"
                      >
                        Google Maps
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<MapPin className="size-5" aria-hidden="true" />}
          title="No venues added yet"
          description="Campus venues and directions will appear here once the schedule is imported."
        />
      )}
    </div>
  );
}
