import { listAnnouncements, type AnnouncementWithEvent } from './announcements';
import { listEventChanges, type EventChangeWithEvent } from './changes';
import { listEvents, type EventWithVenue } from './events';
import { getHunt, isStampPointLive, listStampPoints } from './hunt';
import { isLive, isUpNext } from '@/lib/time';

const URGENT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHANGE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface HuntLiveSummary {
  totalStamps: number;
  closesAt: string | null;
  liveStampName: string | null;
}

export interface LiveData {
  now: EventWithVenue[];
  next: EventWithVenue[];
  announcements: AnnouncementWithEvent[];
  urgent: AnnouncementWithEvent | null;
  changes: EventChangeWithEvent[];
  changedEventIds: string[];
  hunt: HuntLiveSummary;
  serverTime: string;
}

export async function getLiveData(nowDate: Date = new Date()): Promise<LiveData> {
  const [events, recentAnnouncements, recentChanges, huntConfig, stampPoints] =
    await Promise.all([
      listEvents(),
      listAnnouncements(20),
      listEventChanges(20),
      getHunt(),
      listStampPoints(),
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

  const livePoint =
    stampPoints.find((p) => isStampPointLive(p, nowDate)) ?? null;

  return {
    now,
    next,
    announcements: recentAnnouncements.slice(0, 5),
    urgent,
    changes: activeChanges.slice(0, 10),
    changedEventIds,
    hunt: {
      totalStamps: stampPoints.length,
      closesAt: huntConfig?.closes_at ?? null,
      liveStampName: livePoint?.name ?? null,
    },
    serverTime: nowDate.toISOString(),
  };
}
