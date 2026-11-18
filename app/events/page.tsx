import { Suspense } from 'react';
import type { Metadata } from 'next';
import { EventsClient } from '@/components/events-client';
import { EventListSkeleton } from '@/components/list-skeletons';
import { listEvents, type EventWithVenue } from '@/lib/data/events';
import { readWithFallback } from '@/lib/resilience';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Events',
  description: 'All fest events — filter by Live, Soon, Done, category or venue.',
};

export default async function EventsPage() {
  const { data: events } = await readWithFallback<EventWithVenue[]>(
    'page:events',
    () => listEvents(),
    [],
    3000
  );

  const serverTime = new Date().toISOString();

  return (
    <Suspense fallback={<EventListSkeleton count={5} />}>
      <EventsClient events={events} serverTime={serverTime} />
    </Suspense>
  );
}
