'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ParticipantStatus } from '@/lib/types';

async function assertEventHost(eventId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error('Not signed in');
  if (profile.role === 'organiser' || profile.role === 'admin') return;
  const supabase = await createClient();
  const { data } = await supabase.rpc('is_event_host', { p_event: eventId });
  if (!data) throw new Error('Not allowed');
}

const participantRowSchema = z.object({
  name: z.string().trim().min(1).max(80),
  team: z.string().trim().max(80).optional().nullable(),
  college: z.string().trim().max(80).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  performance_order: z.number().int().min(1).max(999).optional().nullable(),
});

export async function importParticipantsAction(
  eventId: string,
  rows: z.infer<typeof participantRowSchema>[]
) {
  await assertEventHost(eventId);
  const parsed = z.array(participantRowSchema).min(1).max(500).safeParse(rows);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid rows' };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('participants')
    .select('id, email')
    .eq('event_id', eventId);

  const byEmail = new Map<string, string>();
  for (const row of existing ?? []) {
    if (row.email) byEmail.set(row.email.toLowerCase(), row.id);
  }

  let created = 0;
  let updated = 0;

  for (const r of parsed.data) {
    const emailKey = r.email?.toLowerCase();
    const matchId = emailKey ? byEmail.get(emailKey) : undefined;
    if (matchId) {
      await supabase
        .from('participants')
        .update({
          name: r.name,
          team: r.team || null,
          college: r.college || null,
          department: r.department || null,
          phone: r.phone || null,
          performance_order: r.performance_order ?? null,
        })
        .eq('id', matchId);
      updated++;
    } else {
      await supabase.from('participants').insert({
        event_id: eventId,
        name: r.name,
        team: r.team || null,
        college: r.college || null,
        department: r.department || null,
        email: r.email || null,
        phone: r.phone || null,
        performance_order: r.performance_order ?? null,
      });
      created++;
    }
  }

  revalidatePath(`/host/events/${eventId}/participants`);
  revalidatePath(`/events/${eventId}/line-up`);
  return { ok: true as const, created, updated };
}

export async function updateParticipantStatusAction(
  eventId: string,
  participantId: string,
  status: ParticipantStatus
) {
  await assertEventHost(eventId);
  const supabase = await createClient();
  const { error } = await supabase
    .from('participants')
    .update({ status })
    .eq('id', participantId)
    .eq('event_id', eventId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/host/events/${eventId}/participants`);
  revalidatePath(`/events/${eventId}/line-up`);
  return { ok: true as const };
}

export async function setShowLineupAction(eventId: string, showPublic: boolean) {
  await assertEventHost(eventId);
  const supabase = await createClient();
  const { error } = await supabase
    .from('participants')
    .update({ show_public: showPublic })
    .eq('event_id', eventId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/host/events/${eventId}/participants`);
  revalidatePath(`/events/${eventId}/line-up`);
  return { ok: true as const };
}
