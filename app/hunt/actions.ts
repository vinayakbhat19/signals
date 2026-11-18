'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import {
  getLeaderboard,
  getMyStamps,
  getStampPoint,
  isStampPointLive,
  listStampPoints,
} from '@/lib/data/hunt';
import { createClient } from '@/lib/supabase/server';
import type { ClaimStampResult } from '@/lib/types';

const toggleHiddenSchema = z.boolean();
const claimSchema = z.object({
  pointId: z.string().uuid('Invalid stamp point link.'),
  code: z.string().trim().min(1, 'Missing stamp code.').max(64),
});

export async function toggleLeaderboardHiddenAction(hidden: boolean) {
  const parsed = toggleHiddenSchema.safeParse(hidden);
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid preference value.' };
  }

  const user = await getUser();
  if (!user) {
    return { ok: false as const, error: 'Sign in first to update this setting.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ leaderboard_hidden: parsed.data })
    .eq('id', user.id);

  if (error) {
    console.error('[hunt/actions] toggleLeaderboardHidden failed:', error);
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/hunt');
  revalidatePath('/hunt/leaderboard');
  revalidatePath('/hunt/board');
  revalidatePath('/');

  return { ok: true as const, hidden: parsed.data };
}

export interface ClaimActionResponse {
  claim: ClaimStampResult;
  pointName: string;
  newRank: number | null;
  nextLive: { name: string; venue: string | null; eventId: string | null } | null;
}

export async function claimStampAction(
  pointId: string,
  code: string
): Promise<ClaimActionResponse> {
  const parsed = claimSchema.safeParse({ pointId, code });
  if (!parsed.success) {
    return {
      claim: {
        ok: false,
        reason: 'unknown',
        message: 'This QR code is incomplete. Scan the Stamp Station screen again.',
      },
      pointName: 'Stamp',
      newRank: null,
      nextLive: null,
    };
  }

  const user = await getUser();
  if (!user) {
    return {
      claim: {
        ok: false,
        reason: 'sign_in',
        message: 'Sign in to join the Stamp Hunt.',
      },
      pointName: 'Stamp',
      newRank: null,
      nextLive: null,
    };
  }

  const supabase = await createClient();
  const [point, rpcRes] = await Promise.all([
    getStampPoint(parsed.data.pointId),
    supabase.rpc('claim_stamp', {
      p_point: parsed.data.pointId,
      p_code: parsed.data.code,
    }),
  ]);

  if (rpcRes.error) {
    console.error('[hunt/actions] claim_stamp RPC failed:', rpcRes.error);
    return {
      claim: {
        ok: false,
        reason: 'unknown',
        message: rpcRes.error.message || 'Could not claim stamp right now.',
      },
      pointName: point?.name ?? 'Stamp',
      newRank: null,
      nextLive: null,
    };
  }

  const claim = rpcRes.data as unknown as ClaimStampResult;

  if (claim.ok) {
    revalidatePath('/hunt');
    revalidatePath('/hunt/leaderboard');
    revalidatePath('/hunt/board');
    revalidatePath('/');
  }

  // Compute user's new rank & suggest the next uncollected live stamp nearby
  const [leaderboard, allPoints, myStamps] = await Promise.all([
    getLeaderboard(100),
    listStampPoints(),
    getMyStamps(user.id),
  ]);

  const myRow = leaderboard.find((r) => r.user_id === user.id);
  const collectedIds = new Set(myStamps.map((s) => s.point_id));
  const now = new Date();
  const nextLivePoint =
    allPoints.find(
      (p) =>
        p.id !== parsed.data.pointId &&
        !collectedIds.has(p.id) &&
        isStampPointLive(p, now)
    ) ?? null;

  return {
    claim,
    pointName: point?.name ?? 'Stamp',
    newRank: myRow?.rank ?? null,
    nextLive: nextLivePoint
      ? {
          name: nextLivePoint.name,
          venue: nextLivePoint.venue_name,
          eventId: nextLivePoint.event_id,
        }
      : null,
  };
}
