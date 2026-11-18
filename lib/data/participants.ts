import { createPublicClient } from '@/lib/supabase/public';
import type { ParticipantPublic } from '@/lib/types';

export async function listPublicLineup(
  eventId: string
): Promise<ParticipantPublic[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('participants_public')
    .select(
      'id, event_id, name, team, college, department, performance_order, status'
    )
    .eq('event_id', eventId)
    .order('performance_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    if (
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message.includes('participants_public')
    ) {
      return [];
    }
    console.error('[data/participants] listPublicLineup failed:', error);
    return [];
  }

  return (data ?? []) as ParticipantPublic[];
}
