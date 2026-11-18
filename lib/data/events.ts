import { createPublicClient } from '@/lib/supabase/public';
import { readBundledSchedule, readEmergencyOverlay } from '@/lib/snapshot';
import type { Event, Result, Venue } from '@/lib/types';

export type VenueSummary = Pick<Venue, 'id' | 'name' | 'maps_url'>;

export interface EventWithVenue extends Event {
  venue: VenueSummary | null;
  venue_name: string | null;
}

export interface EventWithDetails extends EventWithVenue {
  results: Result[];
}

interface RawEventRow extends Event {
  venues: VenueSummary | VenueSummary[] | null;
}

interface RawEventDetailRow extends RawEventRow {
  results: Result[] | null;
}

function normalizeVenue(
  venues: VenueSummary | VenueSummary[] | null | undefined
): VenueSummary | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0] ?? null) : venues;
}

function toEventWithVenue(row: RawEventRow): EventWithVenue {
  const venue = normalizeVenue(row.venues);
  const { venues: _unused, ...rest } = row;
  void _unused;
  return {
    ...rest,
    venue,
    venue_name: venue?.name ?? null,
  };
}

const EVENT_SELECT = '*, venues(id, name, maps_url)';

export async function listEvents(): Promise<EventWithVenue[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('is_published', true)
      .order('starts_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const overlay = readEmergencyOverlay();
    return ((data ?? []) as unknown as RawEventRow[])
      .map(toEventWithVenue)
      .map((ev) => {
        const ov = overlay.eventOverrides[ev.id];
        return ov?.status ? { ...ev, status: ov.status } : ev;
      });
  } catch (err) {
    console.error(
      '[data/events] listEvents failed; using bundled schedule snapshot:',
      err instanceof Error ? err.message : String(err)
    );
    const snap = readBundledSchedule();
    const overlay = readEmergencyOverlay();
    return (snap?.events ?? []).map((ev) => {
      const ov = overlay.eventOverrides[ev.id];
      return ov?.status ? { ...ev, status: ov.status } : ev;
    });
  }
}

export async function getEvent(id: string): Promise<EventWithDetails | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      `${EVENT_SELECT}, results(id, event_id, title, body, is_live, updated_at)`
    )
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    console.error('[data/events] getEvent failed:', error);
    throw new Error(`Failed to load event: ${error.message}`);
  }

  if (!data) return null;

  const row = data as unknown as RawEventDetailRow;
  const base = toEventWithVenue(row);
  const results = (row.results ?? []).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );

  return {
    ...base,
    results,
  };
}

export async function listEventsByVenue(
  venueId: string
): Promise<EventWithVenue[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('is_published', true)
    .eq('venue_id', venueId)
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('[data/events] listEventsByVenue failed:', error);
    throw new Error(`Failed to load venue events: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawEventRow[]).map(toEventWithVenue);
}
