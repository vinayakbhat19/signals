import { createPublicClient } from '@/lib/supabase/public';
import type { EventCategory, Result } from '@/lib/types';

export interface ResultWithEvent extends Result {
  event_title: string;
  event_category: EventCategory | null;
}

interface RawResultRow extends Result {
  events:
    | { title: string; category: EventCategory }
    | { title: string; category: EventCategory }[]
    | null;
}

export async function listResults(): Promise<ResultWithEvent[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('results')
    .select('id, event_id, title, body, is_live, updated_at, events(title, category)')
    .order('is_live', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[data/results] listResults failed:', error);
    throw new Error(`Failed to load results: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawResultRow[]).map((row) => {
    const linked = Array.isArray(row.events) ? row.events[0] : row.events;
    const { events: _unused, ...rest } = row;
    void _unused;
    return {
      ...rest,
      event_title: linked?.title ?? 'Event',
      event_category: linked?.category ?? null,
    };
  });
}
