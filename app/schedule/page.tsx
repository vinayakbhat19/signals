import { Suspense } from 'react';
import type { Metadata } from 'next';
import { EventListSkeleton } from '@/components/list-skeletons';
import { PageHeader } from '@/components/page-header';
import { ScheduleClient } from '@/components/schedule-client';
import { listEvents, type EventWithVenue } from '@/lib/data/events';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'Full fest schedule by day and hour, filterable by category and venue.',
};

export default async function SchedulePage() {
  let events: EventWithVenue[] = [];
  try {
    events = await listEvents();
  } catch (error) {
    console.error('[app/schedule] Failed to load events:', error);
  }

  const serverTime = new Date().toISOString();

  return (
    <div className="space-y-2">
      <PageHeader
        title="Schedule"
        subtitle="All times in IST (Asia/Kolkata)"
      />
      <Suspense fallback={<EventListSkeleton count={5} />}>
        <ScheduleClient events={events} serverTime={serverTime} />
      </Suspense>
    </div>
  );
}
