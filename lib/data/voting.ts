import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import type {
  EventCategory,
  PollPublic,
  PollResultRow,
  Vote,
} from '@/lib/types';

export interface PollWithEvent extends PollPublic {
  event: {
    id: string;
    title: string;
    category: EventCategory;
    starts_at: string;
    ends_at: string;
    venue_name: string | null;
  } | null;
}

const SAFE_POLL_COLUMNS =
  'id, event_id, title, enabled, opens_at, closes_at, results_visibility, college_only, require_code, created_at, updated_at';

function isMissingVotingTable(error: { code?: string; message?: string }) {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (error.message ?? '').includes('polls') ||
    (error.message ?? '').includes('poll_results')
  );
}

export function isPollOpenNow(
  poll: Pick<PollPublic, 'enabled' | 'opens_at' | 'closes_at'>,
  now: Date | string = new Date()
): boolean {
  if (!poll.enabled) return false;
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  if (poll.opens_at && nowMs < new Date(poll.opens_at).getTime()) return false;
  if (poll.closes_at && nowMs > new Date(poll.closes_at).getTime()) return false;
  return true;
}

interface RawPollRow extends PollPublic {
  events:
    | {
        id: string;
        title: string;
        category: EventCategory;
        starts_at: string;
        ends_at: string;
        venues: { name: string } | { name: string }[] | null;
      }
    | Array<{
        id: string;
        title: string;
        category: EventCategory;
        starts_at: string;
        ends_at: string;
        venues: { name: string } | { name: string }[] | null;
      }>
    | null;
}

function normalizePoll(row: RawPollRow): PollWithEvent {
  const ev = Array.isArray(row.events) ? (row.events[0] ?? null) : row.events;
  const venue = ev
    ? Array.isArray(ev.venues)
      ? (ev.venues[0] ?? null)
      : ev.venues
    : null;
  const { events: _unused, ...rest } = row;
  void _unused;
  return {
    ...rest,
    event: ev
      ? {
          id: ev.id,
          title: ev.title,
          category: ev.category,
          starts_at: ev.starts_at,
          ends_at: ev.ends_at,
          venue_name: venue?.name ?? null,
        }
      : null,
  };
}

export async function listPolls(onlyEnabled = true): Promise<PollWithEvent[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from('polls')
    .select(
      `${SAFE_POLL_COLUMNS}, events(id, title, category, starts_at, ends_at, venues(name))`
    )
    .order('updated_at', { ascending: false });

  if (onlyEnabled) {
    query = query.eq('enabled', true);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingVotingTable(error)) return [];
    console.error('[data/voting] listPolls failed:', error);
    throw new Error(`Failed to load polls: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawPollRow[]).map(normalizePoll);
}

export async function getPollByEvent(
  eventId: string
): Promise<PollWithEvent | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('polls')
    .select(
      `${SAFE_POLL_COLUMNS}, events(id, title, category, starts_at, ends_at, venues(name))`
    )
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    if (isMissingVotingTable(error)) return null;
    console.error('[data/voting] getPollByEvent failed:', error);
    throw new Error(`Failed to load poll: ${error.message}`);
  }

  if (!data) return null;
  return normalizePoll(data as unknown as RawPollRow);
}

export async function getPollResults(pollId: string): Promise<PollResultRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('poll_results')
    .select(
      'poll_id, event_id, contestant_id, name, subtitle, photo_url, sort, visible, votes, percent, total_votes'
    )
    .eq('poll_id', pollId)
    .order('votes', { ascending: false, nullsFirst: false })
    .order('sort', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    if (isMissingVotingTable(error)) return [];
    console.error('[data/voting] getPollResults failed:', error);
    throw new Error(`Failed to load poll results: ${error.message}`);
  }

  return (data ?? []) as PollResultRow[];
}

export async function getMyVote(
  pollId: string,
  userId: string
): Promise<Vote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('votes')
    .select('poll_id, user_id, contestant_id, change_count, created_at, updated_at')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingVotingTable(error)) return null;
    return null;
  }

  return (data ?? null) as Vote | null;
}
