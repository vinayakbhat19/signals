import { createPublicClient } from '@/lib/supabase/public';
import type { Venue } from '@/lib/types';

export async function listVenues(): Promise<Venue[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, description, maps_url, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('[data/venues] listVenues failed:', error);
    throw new Error(`Failed to load venues: ${error.message}`);
  }

  return data ?? [];
}

export async function getVenue(id: string): Promise<Venue | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, description, maps_url, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[data/venues] getVenue failed:', error);
    throw new Error(`Failed to load venue: ${error.message}`);
  }

  return data ?? null;
}
