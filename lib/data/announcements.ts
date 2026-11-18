import { createPublicClient } from '@/lib/supabase/public';
import type { Announcement } from '@/lib/types';

export interface AnnouncementWithEvent extends Announcement {
  event_title: string | null;
}

interface RawAnnouncementRow extends Announcement {
  events: { title: string } | { title: string }[] | null;
}

export async function listAnnouncements(
  limit?: number
): Promise<AnnouncementWithEvent[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from('announcements')
    .select('id, message, event_id, priority, created_by, created_at, events(title)')
    .order('created_at', { ascending: false });

  if (typeof limit === 'number' && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[data/announcements] listAnnouncements failed:', error);
    throw new Error(`Failed to load announcements: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawAnnouncementRow[]).map((row) => {
    const linked = Array.isArray(row.events) ? row.events[0] : row.events;
    const { events: _unused, ...rest } = row;
    void _unused;
    return {
      ...rest,
      event_title: linked?.title ?? null,
    };
  });
}
