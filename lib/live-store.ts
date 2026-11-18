'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EventCategory, EventStatus } from '@/lib/types';

export interface FeedStatus {
  mode: 'fest' | 'campus';
  fest_name: string;
  fest_starts_at: string;
  fest_ends_at: string;
  campus_from: string;
  writes_paused: boolean;
  banner: string | null;
  banner_level: 'info' | 'warning' | 'critical';
  version: number;
  poll_seconds: number;
  server_time: string;
}

export interface FeedVenue {
  id: string;
  name: string;
  maps_url: string | null;
}

export interface FeedEvent {
  id: string;
  code?: string | null;
  title: string;
  description?: string | null;
  category: EventCategory;
  venue_id: string | null;
  venue_name?: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  cover_url: string | null;
  host_name: string | null;
  contact_info?: string | null;
  registration_url: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
}

export interface FeedChange {
  id: string;
  event_id: string;
  kind: string;
  message: string;
  created_at: string;
}

export interface FeedNotice {
  id: string;
  message: string;
  priority: 'normal' | 'urgent';
  event_id: string | null;
  created_at: string;
}

export interface FeedPoll {
  poll_id: string;
  event_id: string;
  title: string | null;
  closes_at: string | null;
  results_visibility: 'live' | 'after_close' | 'hidden';
}

export interface LiveFeedPayload {
  status: FeedStatus;
  venues: FeedVenue[];
  events: FeedEvent[];
  changes: FeedChange[];
  notices: FeedNotice[];
  polls: FeedPoll[];
  server_time: string;
}

interface EmergencyFile {
  banner?: string | null;
  level?: 'info' | 'warning' | 'critical';
  events?: Array<{
    id: string;
    status?: EventStatus;
    starts_at?: string;
    ends_at?: string;
  }>;
}

const CACHE_KEY = 'fiesta26_live_feed_v2';

export const DEFAULT_FEED: LiveFeedPayload = {
  status: {
    mode: 'fest',
    fest_name: process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26",
    fest_starts_at: '2026-11-25T00:00:00+05:30',
    fest_ends_at: '2026-11-27T23:59:59+05:30',
    campus_from: '2026-11-28T00:00:00+05:30',
    writes_paused: false,
    banner: null,
    banner_level: 'info',
    version: 0,
    poll_seconds: 30,
    server_time: '2026-11-18T12:00:00.000Z',
  },
  venues: [],
  events: [],
  changes: [],
  notices: [],
  polls: [],
  server_time: '2026-11-18T12:00:00.000Z',
};

function enrichVenues(payload: LiveFeedPayload): LiveFeedPayload {
  const vMap = new Map(payload.venues.map((v) => [v.id, v.name]));
  return {
    ...payload,
    events: payload.events.map((ev) => ({
      ...ev,
      venue_name: ev.venue_name ?? (ev.venue_id ? (vMap.get(ev.venue_id) ?? null) : null),
    })),
  };
}

function applyEmergency(
  payload: LiveFeedPayload,
  emerg: EmergencyFile | null
): LiveFeedPayload {
  if (!emerg) return payload;
  const overrides = new Map((emerg.events ?? []).map((e) => [e.id, e]));
  return {
    ...payload,
    status: {
      ...payload.status,
      banner: emerg.banner || payload.status.banner,
      banner_level: emerg.banner
        ? emerg.level || 'critical'
        : payload.status.banner_level,
    },
    events: payload.events.map((ev) => {
      const ov = overrides.get(ev.id);
      if (!ov) return ev;
      return {
        ...ev,
        status: ov.status ?? ev.status,
        starts_at: ov.starts_at ?? ev.starts_at,
        ends_at: ov.ends_at ?? ev.ends_at,
      };
    }),
  };
}

async function fetchLiveFromTables(): Promise<LiveFeedPayload> {
  const supabase = createClient();
  const [statusRes, evRes, vRes, annRes, chRes] = await Promise.all([
    supabase.rpc('app_status'),
    supabase
      .from('events')
      .select(
        'id, code, title, category, venue_id, starts_at, ends_at, status, cover_url, host_name, contact_info, registration_url'
      )
      .eq('is_published', true)
      .order('starts_at', { ascending: true }),
    supabase
      .from('venues')
      .select('id, name, maps_url')
      .order('name', { ascending: true }),
    supabase
      .from('announcements')
      .select('id, message, priority, event_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('event_changes')
      .select('id, event_id, kind, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (evRes.error) throw new Error(evRes.error.message);

  const nowIso = new Date().toISOString();
  const st = (statusRes.data as Partial<FeedStatus> | null) ?? {};
  return {
    status: {
      ...DEFAULT_FEED.status,
      ...st,
      version: Number(st.version ?? 1),
      poll_seconds: Number(st.poll_seconds ?? 30),
      server_time: st.server_time || nowIso,
    },
    venues: (vRes.data ?? []) as FeedVenue[],
    events: (evRes.data ?? []).map((e) => ({
      ...(e as unknown as FeedEvent),
      registration_opens_at: null,
      registration_closes_at: null,
    })),
    changes: (chRes.data ?? []) as FeedChange[],
    notices: (annRes.data ?? []) as FeedNotice[],
    polls: [],
    server_time: st.server_time || nowIso,
  };
}

export function useLiveFeed() {
  const [feed, setFeed] = useState<LiveFeedPayload>(DEFAULT_FEED);
  const [source, setSource] = useState<'loading' | 'live' | 'backup'>('loading');
  const [offline, setOffline] = useState(false);
  const versionRef = useRef<number>(-1);
  const emergencyRef = useRef<EmergencyFile | null>(null);

  const loadEmergency = useCallback(async () => {
    try {
      const r = await fetch('/emergency.json', { cache: 'no-store' });
      if (r.ok) {
        emergencyRef.current = (await r.json()) as EmergencyFile;
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshFeed = useCallback(
    async (forceFull = false) => {
      try {
        const supabase = createClient();
        // Step 1: Tiny version check via app_status()
        const statusRes = await supabase.rpc('app_status');
        const nextStatus = statusRes.data as Partial<FeedStatus> | null;
        const remoteVersion = Number(nextStatus?.version ?? 0);

        if (
          !forceFull &&
          nextStatus &&
          remoteVersion > 0 &&
          remoteVersion === versionRef.current
        ) {
          setFeed((prev) =>
            applyEmergency(
              {
                ...prev,
                status: { ...prev.status, ...nextStatus },
                server_time: nextStatus.server_time || new Date().toISOString(),
              },
              emergencyRef.current
            )
          );
          setSource('live');
          setOffline(false);
          return;
        }

        // Step 2: Fetch full live_feed() ONLY when version changed or on first load
        const liveRes = await supabase.rpc('live_feed');
        let payload: LiveFeedPayload;
        if (!liveRes.error && liveRes.data && Array.isArray(liveRes.data.events)) {
          payload = liveRes.data as LiveFeedPayload;
        } else {
          payload = await fetchLiveFromTables();
        }

        const enriched = enrichVenues(payload);
        versionRef.current = Number(enriched.status.version ?? 1);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(enriched));
        } catch {
          // ignore storage quota errors
        }
        setFeed(applyEmergency(enriched, emergencyRef.current));
        setSource('live');
        setOffline(false);
      } catch {
        setSource('backup');
        setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function boot() {
      // Instant load from localStorage or bundled /live-fallback.json
      let loadedCache = false;
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = enrichVenues(JSON.parse(cached) as LiveFeedPayload);
          if (active) setFeed(parsed);
          versionRef.current = Number(parsed.status?.version ?? 0);
          loadedCache = true;
        }
      } catch {
        // ignore
      }

      if (!loadedCache) {
        try {
          const fbRes = await fetch('/live-fallback.json');
          if (fbRes.ok) {
            const parsed = enrichVenues((await fbRes.json()) as LiveFeedPayload);
            if (active) setFeed(parsed);
          }
        } catch {
          // ignore
        }
      }

      await loadEmergency();
      if (active) await refreshFeed(true);
    }

    void boot();

    function scheduleNext() {
      const baseSec = Math.max(10, Math.min(300, feed.status.poll_seconds || 30));
      // ±30% jitter (HOSTING_CLOUDFLARE.md §3.4)
      const jitterFactor = 0.7 + Math.random() * 0.6;
      const delayMs = Math.round(baseSec * 1000 * jitterFactor);
      timer = window.setTimeout(async () => {
        if (!active) return;
        if (!document.hidden) {
          await loadEmergency();
          await refreshFeed(false);
        }
        if (active) scheduleNext();
      }, delayMs);
    }

    scheduleNext();

    function onOnline() {
      setOffline(false);
      void refreshFeed(true);
    }
    function onOffline() {
      setOffline(true);
    }
    function onVisibility() {
      if (!document.hidden) void refreshFeed(false);
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [feed.status.poll_seconds, loadEmergency, refreshFeed]);

  return {
    feed,
    source,
    offline,
    refresh: () => refreshFeed(true),
  };
}
