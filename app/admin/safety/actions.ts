'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOrganiser } from '@/lib/auth';
import { mapDbError } from '@/lib/modes';
import { flushPushQueue } from '@/lib/push';
import {
  CAMPUS_PREVIEW_COOKIE,
  signCampusPreviewToken,
} from '@/lib/status';
import { createClient } from '@/lib/supabase/server';

const ConfigSchema = z.object({
  writes_paused: z.boolean(),
  mode_override: z.enum(['auto', 'fest', 'campus']),
  banner_message: z.string().trim().max(200).nullable(),
  banner_level: z.enum(['info', 'warning', 'critical']),
  campus_from: z.string().optional(),
  hosts_until: z.string().optional(),
});

export async function updateAppConfigAction(
  input: z.infer<typeof ConfigSchema>
) {
  await requireOrganiser();
  const parsed = ConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid configuration.',
    };
  }

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = {
    writes_paused: parsed.data.writes_paused,
    mode_override: parsed.data.mode_override,
    banner_message: parsed.data.banner_message || null,
    banner_level: parsed.data.banner_level,
  };
  if (parsed.data.campus_from) updatePayload.campus_from = parsed.data.campus_from;
  if (parsed.data.hosts_until) updatePayload.hosts_until = parsed.data.hosts_until;

  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (k: string, id: number) => Promise<{
            error: { code?: string; message?: string } | null;
          }>;
        };
      };
    }
  )
    .from('app_config')
    .update(updatePayload)
    .eq('id', 1);

  if (error) {
    return { ok: false as const, error: mapDbError(error) };
  }

  revalidatePath('/');
  revalidatePath('/admin/safety');
  revalidatePath('/api/live');
  return { ok: true as const };
}

export async function toggleCampusPreviewAction(enable: boolean) {
  const profile = await requireOrganiser();
  const cookieStore = await cookies();
  if (enable) {
    cookieStore.set(CAMPUS_PREVIEW_COOKIE, signCampusPreviewToken(profile.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2,
      path: '/',
    });
  } else {
    cookieStore.delete(CAMPUS_PREVIEW_COOKIE);
  }
  revalidatePath('/');
  revalidatePath('/admin/safety');
  return { ok: true as const };
}

export async function archiveAndPurgeFestAction(confirmation: string) {
  await requireOrganiser();
  if (confirmation.trim() !== 'DELETE FEST DATA') {
    return {
      ok: false as const,
      error: 'Type DELETE FEST DATA exactly to confirm.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string
      ) => Promise<{
        data: {
          ok?: boolean;
          votes_deleted?: number;
          push_deleted?: number;
          contacts_cleared?: number;
        } | null;
        error: { code?: string; message?: string } | null;
      }>;
    }
  ).rpc('archive_and_purge_fest');

  if (error) {
    return { ok: false as const, error: mapDbError(error) };
  }

  revalidatePath('/admin/safety');
  revalidatePath('/fest-archive');
  return {
    ok: true as const,
    votesDeleted: data?.votes_deleted ?? 0,
    pushDeleted: data?.push_deleted ?? 0,
    contactsCleared: data?.contacts_cleared ?? 0,
  };
}

export async function resendPushAlertsAction() {
  await requireOrganiser();
  const result = await flushPushQueue();
  revalidatePath('/admin/safety');
  return { ok: true as const, ...result };
}
