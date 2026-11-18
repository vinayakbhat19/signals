'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ParticipantStatus } from '@/lib/types';

async function assertEventHost(eventId: string) {
  return requireRole('host', eventId);
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
  const profile = await assertEventHost(eventId);
  const rl = await rateLimit(`participants-import:${profile.id}`, {
    limit: 10,
    windowSeconds: 3600,
    failMode: 'open',
  });
  if (!rl.allowed) {
    return {
      ok: false as const,
      error: `Too many imports. Try again in ${rl.retryAfter || 60} seconds.`,
    };
  }
  const parsed = z.array(participantRowSchema).min(1).max(5000).safeParse(rows);
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

export async function logParticipantExportAction(
  eventId: string,
  rowCount: number
) {
  const profile = await assertEventHost(eventId);
  try {
    const admin = createAdminClient();
    await (
      admin as unknown as {
        from: (t: string) => {
          insert: (row: Record<string, unknown>) => Promise<unknown>;
        };
      }
    )
      .from('audit_log')
      .insert({
        actor: profile.id,
        action: 'participants_exported',
        target: eventId,
        detail: { row_count: rowCount },
      });
  } catch {
    // Graceful no-op if schema_ops.sql not applied yet
  }
  return { ok: true as const };
}
