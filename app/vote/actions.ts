'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { CastVoteResult } from '@/lib/types';

const onlineVoteSchema = z.object({
  pollId: z.string().uuid(),
  contestantId: z.string().uuid(),
  eventId: z.string().uuid(),
  code: z.string().trim().max(16).optional(),
});

const offlineVoteSchema = z.object({
  pollId: z.string().uuid(),
  contestantId: z.string().uuid(),
  eventId: z.string().uuid(),
  code: z.string().trim().min(1).max(16),
  castAt: z.string().datetime(),
  clientRef: z.string().uuid(),
});

export async function castVoteAction(input: {
  pollId: string;
  contestantId: string;
  eventId: string;
  code?: string;
}): Promise<CastVoteResult> {
  const parsed = onlineVoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid', message: 'Invalid vote request.' };
  }

  const user = await getUser();
  if (!user) {
    return { ok: false, reason: 'sign_in', message: 'Sign in to vote.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cast_vote', {
    p_poll: parsed.data.pollId,
    p_contestant: parsed.data.contestantId,
    p_code: parsed.data.code || null,
  });

  if (error) {
    console.error('[vote/actions] cast_vote failed:', error);
    return { ok: false, reason: 'unknown', message: error.message };
  }

  const res = data as unknown as CastVoteResult;
  if (res.ok) {
    revalidatePath(`/vote/${parsed.data.eventId}`);
    revalidatePath(`/api/vote/${parsed.data.eventId}`);
    revalidatePath('/vote');
  }
  return res;
}

export async function syncOfflineVoteAction(input: {
  pollId: string;
  contestantId: string;
  eventId: string;
  code: string;
  castAt: string;
  clientRef: string;
}): Promise<CastVoteResult> {
  const parsed = offlineVoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Saved offline vote is incomplete.',
    };
  }

  const user = await getUser();
  if (!user) {
    return {
      ok: false,
      reason: 'sign_in',
      message: 'Sign in to send your saved vote.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cast_vote_offline', {
    p_poll: parsed.data.pollId,
    p_contestant: parsed.data.contestantId,
    p_code: parsed.data.code,
    p_cast_at: parsed.data.castAt,
    p_client_ref: parsed.data.clientRef,
  });

  if (error) {
    console.error('[vote/actions] cast_vote_offline failed:', error);
    return { ok: false, reason: 'unknown', message: error.message };
  }

  const res = data as unknown as CastVoteResult;
  if (res.ok) {
    revalidatePath(`/vote/${parsed.data.eventId}`);
    revalidatePath(`/api/vote/${parsed.data.eventId}`);
  }
  return res;
}
