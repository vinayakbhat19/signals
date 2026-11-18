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

export interface TreasureClueItem {
  sort: number;
  point_id: string;
  mascot: string;
  found: boolean;
  found_at: string | null;
  points: number | null;
  clue: string | null;
  hint: string | null;
  place: string | null;
  found_text: string | null;
  locked: boolean;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function isIgnorableSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === '42501' ||
    error.code === '42703' ||
    error.code === '42883' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST202' ||
    Boolean(error.message?.includes('does not exist'))
  );
}

export function isStampPointLive(
  point: StampPointWithEvent,
  now: Date | string = new Date()
): boolean {
  if (!point.active) return false;
  if (!point.event) return true;
  if (point.event.status === 'cancelled') return false;
  const nowMs = typeof now === 'string' ? new Date(now).getTime() : now.getTime();
  const startMs = new Date(point.event.starts_at).getTime();
  const endMs = new Date(point.event.ends_at).getTime();
  return nowMs >= startMs - TEN_MINUTES_MS && nowMs <= endMs + FIFTEEN_MINUTES_MS;
}

export async function getHunt(): Promise<StampHunt | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('stamp_hunt')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (isIgnorableSchemaError(error)) return null;
    console.error('[data/hunt] getHunt failed:', error.message);
    return null;
  }

  return (data as unknown as StampHunt) ?? null;
}

/**
 * Loads the player's clue-based Treasure Hunt passport via my_hunt() RPC.
 * Place names stay hidden on the server until the player collects each stamp.
 */
export async function getMyHuntPassport(): Promise<TreasureClueItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string
        ) => Promise<{
          data: TreasureClueItem[] | null;
          error: { code?: string; message?: string } | null;
        }>;
      }
    ).rpc('my_hunt');

    if (error) {
      if (isIgnorableSchemaError(error)) return [];
      console.error('[data/hunt] my_hunt failed:', error.message);
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
}

export async function listStampPoints(): Promise<StampPointWithEvent[]> {
  // MUST stay cookie-less so /, /api/live, and /hunt/board remain Static/ISR (edge-cached)!
  try {
    const supabase = createPublicClient();
    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string
        ) => Promise<{
          data: TreasureClueItem[] | null;
          error: { code?: string; message?: string } | null;
        }>;
      }
    ).rpc('my_hunt');

    if (error || !data) return [];
    return data.map((item) => ({
      id: item.point_id,
      name: item.place ?? `Clue #${item.sort}`,
      event_id: null,
      venue_id: null,
      mascot: item.mascot as StampPointPublic['mascot'],
      bonus_from: null,
      bonus_to: null,
      active: true,
      sort: item.sort,
      event: null,
      venue_name: null,
    }));
  } catch {
    return [];
  }
}

export async function getStampPoint(
  pointId: string
): Promise<StampPointWithEvent | null> {
  const passport = await getMyHuntPassport();
  const match = passport.find((p) => p.point_id === pointId);
  if (!match) return null;
  return {
    id: match.point_id,
    name: match.place ?? `Clue #${match.sort}`,
    event_id: null,
    venue_id: null,
    mascot: match.mascot as StampPointPublic['mascot'],
    bonus_from: null,
    bonus_to: null,
    active: true,
    sort: match.sort,
    event: null,
    venue_name: null,
  };
}

export async function getLeaderboard(
  limit = 100
): Promise<RankedLeaderboardEntry[]> {
  const supabase = createPublicClient();
  // Select only columns guaranteed in both new and old stamp_leaderboard views (no `verified`)
  const { data, error } = await supabase
    .from('stamp_leaderboard')
    .select('user_id, display_name, stamps, score, last_scan')
    .order('score', { ascending: false })
    .order('last_scan', { ascending: true })
    .limit(limit);

  if (error) {
    if (isIgnorableSchemaError(error)) return [];
    console.error('[data/hunt] getLeaderboard failed:', error.message);
    return [];
  }

  return (data ?? []).map((row, index) => ({
    ...row,
    verified: false,
    rank: index + 1,
  }));
}

export async function getMyStamps(userId: string): Promise<Stamp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stamps')
    .select('user_id, point_id, points, scanned_at')
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false });

  if (error) {
    if (isIgnorableSchemaError(error)) return [];
    console.error('[data/hunt] getMyStamps failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    method: 'live' as const,
  }));
}
