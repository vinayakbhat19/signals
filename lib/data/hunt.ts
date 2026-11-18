import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import type {
  EventStatus,
  LeaderboardRow,
  Stamp,
  StampHunt,
  StampPointPublic,
} from '@/lib/types';

export interface StampPointWithEvent extends StampPointPublic {
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    status: EventStatus;
  } | null;
  venue_name: string | null;
}

export interface RankedLeaderboardEntry extends LeaderboardRow {
  rank: number;
}

interface RawStampPointRow extends StampPointPublic {
  events:
    | {
        id: string;
        title: string;
        starts_at: string;
        ends_at: string;
        status: EventStatus;
      }
    | {
        id: string;
        title: string;
        starts_at: string;
        ends_at: string;
        status: EventStatus;
      }[]
    | null;
  venues: { name: string } | { name: string }[] | null;
}

const SAFE_STAMP_POINT_COLUMNS =
  'id, name, event_id, venue_id, mascot, sort, active, bonus_from, bonus_to';

function isMissingTableError(error: { code?: string; message?: string }) {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (error.message ?? '').includes('stamp_')
  );
}

/**
 * Matches schema_stamps.sql claim_stamp() live window:
 * 10 min before starts_at to 15 min after ends_at (and not cancelled).
 * Points without a linked event (e.g. Help desk) are live whenever active.
 */
export function isStampPointLive(
  point: Pick<StampPointWithEvent, 'active' | 'event'>,
  now: Date | string = new Date()
): boolean {
  if (!point.active) return false;
  if (!point.event) return true;
  if (point.event.status === 'cancelled') return false;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const startWindow = new Date(point.event.starts_at).getTime() - 10 * 60_000;
  const endWindow = new Date(point.event.ends_at).getTime() + 15 * 60_000;
  return nowMs >= startWindow && nowMs <= endWindow;
}

export async function getHunt(): Promise<StampHunt | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('stamp_hunt')
    .select(
      'id, name, opens_at, closes_at, stamp_value, bonus_value, printed_value, complete_bonus'
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.error('[data/hunt] getHunt failed:', error);
    throw new Error(`Failed to load hunt config: ${error.message}`);
  }

  return data ?? null;
}

export async function listStampPoints(): Promise<StampPointWithEvent[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('stamp_points')
    .select(
      `${SAFE_STAMP_POINT_COLUMNS}, events(id, title, starts_at, ends_at, status), venues(name)`
    )
    .eq('active', true)
    .order('sort', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error('[data/hunt] listStampPoints failed:', error);
    throw new Error(`Failed to load stamp points: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawStampPointRow[]).map((row) => {
    const event = Array.isArray(row.events) ? (row.events[0] ?? null) : row.events;
    const venue = Array.isArray(row.venues) ? (row.venues[0] ?? null) : row.venues;
    const { events: _e, venues: _v, ...rest } = row;
    void _e;
    void _v;
    return {
      ...rest,
      event: event ?? null,
      venue_name: venue?.name ?? null,
    };
  });
}

export async function getStampPoint(
  pointId: string
): Promise<StampPointWithEvent | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('stamp_points')
    .select(
      `${SAFE_STAMP_POINT_COLUMNS}, events(id, title, starts_at, ends_at, status), venues(name)`
    )
    .eq('id', pointId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.error('[data/hunt] getStampPoint failed:', error);
    throw new Error(`Failed to load stamp point: ${error.message}`);
  }

  if (!data) return null;
  const row = data as unknown as RawStampPointRow;
  const event = Array.isArray(row.events) ? (row.events[0] ?? null) : row.events;
  const venue = Array.isArray(row.venues) ? (row.venues[0] ?? null) : row.venues;
  const { events: _e, venues: _v, ...rest } = row;
  void _e;
  void _v;
  return {
    ...rest,
    event: event ?? null,
    venue_name: venue?.name ?? null,
  };
}

export async function getLeaderboard(
  limit = 100
): Promise<RankedLeaderboardEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('stamp_leaderboard')
    .select('user_id, display_name, verified, stamps, score, last_scan')
    .order('score', { ascending: false })
    .order('last_scan', { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error('[data/hunt] getLeaderboard failed:', error);
    throw new Error(`Failed to load leaderboard: ${error.message}`);
  }

  return (data ?? []).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export async function getMyStamps(userId: string): Promise<Stamp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stamps')
    .select('user_id, point_id, points, method, scanned_at')
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error('[data/hunt] getMyStamps failed:', error);
    return [];
  }

  return (data ?? []) as Stamp[];
}
