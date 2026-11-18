import { notFound } from 'next/navigation';
import { CalendarSearch } from 'lucide-react';
import { CategoryChip } from '@/components/category-chip';
import { EmptyState } from '@/components/empty-state';
import {
  AnnouncementListSkeleton,
  EventListSkeleton,
  VenueListSkeleton,
} from '@/components/list-skeletons';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EVENT_CATEGORIES, EVENT_STATUSES } from '@/lib/types';
import { StyleguideInteractive } from './styleguide-client';
import type { EventCardData } from '@/components/event-card';

const SAMPLE_EVENTS: EventCardData[] = [
  {
    id: 'demo-live',
    title: 'Battle of Bands — Main Finals',
    category: 'cultural',
    starts_at: '2026-11-25T10:30:00.000Z',
    ends_at: '2026-11-25T12:30:00.000Z',
    status: 'scheduled',
    venue_name: 'Main Stage',
  },
  {
    id: 'demo-delayed',
    title: 'Intro to Flutter Workshop',
    category: 'workshop',
    starts_at: '2026-11-25T11:30:00.000Z',
    ends_at: '2026-11-25T13:30:00.000Z',
    status: 'delayed',
    venue_name: 'Seminar Hall 1',
  },
  {
    id: 'demo-cancelled',
    title: 'Outdoor Drone Race (Rain Cancelled)',
    category: 'tech',
    starts_at: '2026-11-25T12:00:00.000Z',
    ends_at: '2026-11-25T13:00:00.000Z',
    status: 'cancelled',
    venue_name: 'Sports Ground',
  },
  {
    id: 'demo-done',
    title: 'Inauguration Ceremony',
    category: 'official',
    starts_at: '2026-11-25T04:00:00.000Z',
    ends_at: '2026-11-25T05:00:00.000Z',
    status: 'done',
    venue_name: 'Auditorium',
  },
];

export default function StyleguidePage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Component Styleguide"
        subtitle="Development-only visual check for all Fest Live UI components and states."
        action={<Badge variant="secondary">DEV ONLY</Badge>}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">CategoryChip (7 categories)</h2>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((category) => (
            <CategoryChip key={category} category={category} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">StatusBadge (4 statuses)</h2>
        <div className="flex flex-wrap gap-2">
          {EVENT_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11 px-4">Primary</Button>
          <Button variant="secondary" className="min-h-11 px-4">
            Secondary
          </Button>
          <Button variant="outline" className="min-h-11 px-4">
            Outline
          </Button>
          <Button variant="ghost" className="min-h-11 px-4">
            Ghost
          </Button>
          <Button variant="destructive" className="min-h-11 px-4">
            Destructive
          </Button>
        </div>
      </section>

      <StyleguideInteractive sampleEvents={SAMPLE_EVENTS} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">EmptyState</h2>
        <EmptyState
          icon={<CalendarSearch className="size-5" aria-hidden="true" />}
          title="No events match your filters"
          description="Try clearing a category filter or searching for another venue name."
          actionLabel="View full schedule"
          actionHref="/schedule"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Loading Skeletons</h2>
        <div className="space-y-4">
          <EventListSkeleton count={2} />
          <AnnouncementListSkeleton count={2} />
          <VenueListSkeleton count={2} />
        </div>
      </section>
    </div>
  );
}
