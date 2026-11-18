'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { mapDbError } from '@/lib/modes';
import { createClient } from '@/lib/supabase/server';

const HostEventUpdateSchema = z.object({
  eventId: z.string().uuid(),
  starts_at: z.string().min(10).optional(),
  ends_at: z.string().min(10).optional(),
  venue_id: z.string().uuid().optional().nullable(),
  status: z.enum(['scheduled', 'delayed', 'cancelled', 'done']).optional(),
  description: z.string().max(2000).optional().nullable(),
  registration_url: z.string().max(300).optional().nullable(),
  registration_opens_at: z.string().optional().nullable(),
  registration_closes_at: z.string().optional().nullable(),
  contact_info: z.string().max(200).optional().nullable(),
  host_coordinator: z.string().max(80).optional().nullable(),
});

export async function hostUpdateEventAction(
  input: z.infer<typeof HostEventUpdateSchema>
) {
  const parsed = HostEventUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid event update.',
    };
  }

  await requireRole('host', parsed.data.eventId);
  const supabase = await createClient();

  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{
        data: { ok?: boolean; message?: string; changed?: string[] } | null;
        error: { code?: string; message?: string } | null;
      }>;
    }
  ).rpc('host_update_event', {
    p_event: parsed.data.eventId,
    p_starts_at: parsed.data.starts_at ?? null,
    p_ends_at: parsed.data.ends_at ?? null,
    p_venue_id: parsed.data.venue_id ?? null,
    p_status: parsed.data.status ?? null,
    p_description: parsed.data.description ?? null,
    p_registration_url: parsed.data.registration_url ?? null,
    p_registration_opens_at: parsed.data.registration_opens_at || null,
    p_registration_closes_at: parsed.data.registration_closes_at || null,
    p_contact_info: parsed.data.contact_info ?? null,
    p_cover_url: null,
    p_host_coordinator: parsed.data.host_coordinator ?? null,
  });

  if (error) {
    return { ok: false as const, error: mapDbError(error) };
  }
  if (!data?.ok) {
    return {
      ok: false as const,
      error: data?.message || 'Could not update event.',
    };
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/host/events/${parsed.data.eventId}`);
  revalidatePath('/api/live');
  return { ok: true as const, changed: data.changed ?? [] };
}
