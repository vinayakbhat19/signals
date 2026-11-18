'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOrganiser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const PlaceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Place name is required').max(60),
  clue: z.string().trim().min(3, 'Clue riddle is required').max(300),
  hint: z.string().trim().max(300).optional().nullable(),
  found_text: z.string().trim().max(200).optional().nullable(),
  mascot: z.enum(['spark', 'zap', 'beat', 'kick', 'doodle', 'buzz']).default('spark'),
  sort: z.number().int().min(0).max(99).default(1),
  active: z.boolean().default(true),
});

const HuntSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  opens_at: z.string().min(10),
  closes_at: z.string().min(10),
  stamp_value: z.number().int().min(1).max(100),
  complete_bonus: z.number().int().min(0).max(500),
  min_gap_seconds: z.number().int().min(0).max(600),
  sequential: z.boolean(),
});

export async function saveHuntSettingsAction(
  input: z.infer<typeof HuntSettingsSchema>
) {
  await requireOrganiser();
  const parsed = HuntSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid hunt settings.',
    };
  }

  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        upsert: (v: Record<string, unknown>) => Promise<{
          error: { message?: string } | null;
        }>;
      };
    }
  )
    .from('stamp_hunt')
    .upsert({ id: 1, ...parsed.data });

  if (error) return { ok: false as const, error: error.message || 'Save failed' };
  revalidatePath('/hunt');
  revalidatePath('/admin/hunt');
  return { ok: true as const };
}

export async function saveHuntPlaceAction(input: z.infer<typeof PlaceSchema>) {
  await requireOrganiser();
  const parsed = PlaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid place details.',
    };
  }

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    clue: parsed.data.clue,
    hint: parsed.data.hint || null,
    found_text: parsed.data.found_text || null,
    mascot: parsed.data.mascot,
    sort: parsed.data.sort,
    active: parsed.data.active,
  };

  const untyped = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (k: string, id: string) => Promise<{ error: { message?: string } | null }>;
      };
      insert: (v: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    };
  };

  const { error } = parsed.data.id
    ? await untyped.from('stamp_points').update(payload).eq('id', parsed.data.id)
    : await untyped.from('stamp_points').insert(payload);

  if (error) return { ok: false as const, error: error.message || 'Save failed' };
  revalidatePath('/hunt');
  revalidatePath('/admin/hunt');
  revalidatePath('/admin/hunt/qr');
  return { ok: true as const };
}

export async function toggleHuntPlaceActiveAction(
  pointId: string,
  active: boolean
) {
  await requireOrganiser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('stamp_points')
    .update({ active })
    .eq('id', pointId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/hunt');
  revalidatePath('/admin/hunt');
  revalidatePath('/admin/hunt/qr');
  return { ok: true as const };
}

export async function rotateStampCodeAction(pointId: string) {
  await requireOrganiser();
  const supabase = await createClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: { p_point: string }
      ) => Promise<{
        data: { ok?: boolean } | null;
        error: { message?: string } | null;
      }>;
    }
  ).rpc('rotate_stamp_code', { p_point: pointId });
  if (error || !data?.ok) {
    return {
      ok: false as const,
      error: error?.message || 'Could not rotate code.',
    };
  }
  revalidatePath('/admin/hunt');
  revalidatePath('/admin/hunt/qr');
  return { ok: true as const };
}
