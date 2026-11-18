import { createPublicClient } from '@/lib/supabase/public';
import type { EventChange } from '@/lib/types';

export interface EventChangeWithEvent extends EventChange {
  event_title: string;
}

interface RawEventChangeRow extends EventChange {
  events: { title: string } | { title: string }[] | null;
}

export async function listEventChanges(
  limit = 30
): Promise<EventChangeWithEvent[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('event_changes')
    .select(
      'id, event_id, kind, old_starts_at, new_starts_at, old_venue, new_venue, message, created_at, events(title)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Gracefully return empty if schema_changes.sql hasn't been run yet
    if (
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message.includes('event_changes')
    ) {
      return [];
    }
    console.error('[data/changes] listEventChanges failed:', error);
    throw new Error(`Failed to load event changes: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawEventChangeRow[]).map((row) => {
    const linked = Array.isArray(row.events) ? row.events[0] : row.events;
    const { events: _unused, ...rest } = row;
    void _unused;
    return {
      ...rest,
      event_title: linked?.title ?? 'Event',
    };
  });
}
