import type { Metadata } from 'next';
import { UpdatesClient } from '@/components/updates-client';
import {
  listAnnouncements,
  type AnnouncementWithEvent,
} from '@/lib/data/announcements';
import {
  listEventChanges,
  type EventChangeWithEvent,
} from '@/lib/data/changes';
import { readWithFallback } from '@/lib/resilience';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Updates',
  description:
    'Automatic schedule change alerts and official committee notices.',
};

export default async function UpdatesPage() {
  const [announcementsRes, changesRes] = await Promise.all([
    readWithFallback<AnnouncementWithEvent[]>(
      'page:updates:announcements',
      () => listAnnouncements(),
      [],
      3000
    ),
    readWithFallback<EventChangeWithEvent[]>(
      'page:updates:changes',
      () => listEventChanges(),
      [],
      3000
    ),
  ]);

  return (
    <UpdatesClient
      announcements={announcementsRes.data}
      changes={changesRes.data}
      serverTime={new Date().toISOString()}
    />
  );
}
