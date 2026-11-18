import { NextResponse } from 'next/server';
import { getLiveData, type LiveData } from '@/lib/data/live';
import { DEFAULT_APP_STATUS, type AppStatus } from '@/lib/modes';
import { readWithFallback } from '@/lib/resilience';
import { readBundledSchedule, readEmergencyOverlay } from '@/lib/snapshot';
import { getPublicAppStatus } from '@/lib/status';
import { isLive, isUpNext } from '@/lib/time';

export const revalidate = 15;

function buildBundledLiveFallback(nowDate: Date): LiveData {
  const snap = readBundledSchedule();
  const overlay = readEmergencyOverlay();

  const rawEvents = snap?.events ?? [];
  const events = rawEvents.map((ev) => {
    const override = overlay.eventOverrides[ev.id];
    return override?.status ? { ...ev, status: override.status } : ev;
  });

  const announcements = [
    ...overlay.announcements.map((a) => ({ ...a, event_title: null })),
    ...(snap?.announcements ?? []).map((a) => ({ ...a, event_title: null })),
  ];

  const urgent =
    announcements.find((a) => a.priority === 'urgent') ?? null;

  return {
    now: events.filter((e) => isLive(e, nowDate)),
    next: events.filter((e) => isUpNext(e, nowDate)).slice(0, 5),
    announcements: announcements.slice(0, 5),
    urgent,
    changes: [],
    changedEventIds: [],
    hunt: { totalStamps: 0, closesAt: null, liveStampName: null },
    serverTime: nowDate.toISOString(),
  };
}

export async function GET() {
  const nowDate = new Date();
  const [liveResult, statusResult] = await Promise.all([
    readWithFallback(
      'api:live',
      () => getLiveData(nowDate),
      buildBundledLiveFallback(nowDate),
      3000
    ),
    getPublicAppStatus(),
  ]);

  // Overlay any emergency announcements even if primary succeeded or failed
  const overlay = readEmergencyOverlay();
  const mergedAnnouncements =
    overlay.announcements.length > 0
      ? [
          ...overlay.announcements.map((a) => ({ ...a, event_title: null })),
          ...liveResult.data.announcements,
        ].slice(0, 8)
      : liveResult.data.announcements;

  const urgent =
    overlay.announcements.find((a) => a.priority === 'urgent')
      ? {
          ...overlay.announcements.find((a) => a.priority === 'urgent')!,
          event_title: null,
        }
      : liveResult.data.urgent;

  const appStatus: AppStatus = statusResult.status ?? DEFAULT_APP_STATUS;

  return NextResponse.json(
    {
      ...liveResult.data,
      announcements: mergedAnnouncements,
      urgent,
      appStatus,
      _source: liveResult.source,
    },
    {
      headers: {
        'Cache-Control':
          'public, s-maxage=15, stale-while-revalidate=300, stale-if-error=86400',
      },
    }
  );
}
