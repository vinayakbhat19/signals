import { listAnnouncements, type AnnouncementWithEvent } from './announcements';
import { listEvents, type EventWithVenue } from './events';
import { isLive, isUpNext } from '@/lib/time';

const URGENT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

export interface LiveData {
  now: EventWithVenue[];
  next: EventWithVenue[];
  announcements: AnnouncementWithEvent[];
  urgent: AnnouncementWithEvent | null;
  serverTime: string;
}

export async function getLiveData(nowDate: Date = new Date()): Promise<LiveData> {
  const [events, recentAnnouncements] = await Promise.all([
    listEvents(),
    listAnnouncements(20),
  ]);

  const now = events.filter((event) => isLive(event, nowDate));
  const next = events.filter((event) => isUpNext(event, nowDate)).slice(0, 5);

  const urgentCutoffMs = nowDate.getTime() - URGENT_WINDOW_MS;
  const urgent =
    recentAnnouncements.find(
      (item) =>
        item.priority === 'urgent' &&
        new Date(item.created_at).getTime() >= urgentCutoffMs
    ) ?? null;

  return {
    now,
    next,
    announcements: recentAnnouncements.slice(0, 3),
    urgent,
    serverTime: nowDate.toISOString(),
  };
}
