import { listAnnouncements, type AnnouncementWithEvent } from './announcements';
import { listEventChanges, type EventChangeWithEvent } from './changes';
import { listEvents, type EventWithVenue } from './events';
import { isLive, isUpNext } from '@/lib/time';

const URGENT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHANGE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface LiveData {
  now: EventWithVenue[];
  next: EventWithVenue[];
  announcements: AnnouncementWithEvent[];
  urgent: AnnouncementWithEvent | null;
  changes: EventChangeWithEvent[];
  changedEventIds: string[];
  serverTime: string;
}

export async function getLiveData(nowDate: Date = new Date()): Promise<LiveData> {
  const [events, recentAnnouncements, recentChanges] = await Promise.all([
    listEvents(),
    listAnnouncements(20),
    listEventChanges(20),
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

  const changeCutoffMs = nowDate.getTime() - CHANGE_WINDOW_MS;
  const activeChanges = recentChanges.filter(
    (c) => new Date(c.created_at).getTime() >= changeCutoffMs
  );
  const changedEventIds = Array.from(
    new Set(activeChanges.map((c) => c.event_id))
  );

  return {
    now,
    next,
    announcements: recentAnnouncements.slice(0, 5),
    urgent,
    changes: activeChanges.slice(0, 10),
    changedEventIds,
    serverTime: nowDate.toISOString(),
  };
}
