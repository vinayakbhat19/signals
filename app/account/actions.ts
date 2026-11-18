'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const nameSchema = z.string().trim().min(1, 'Name cannot be empty').max(80);

export async function updateProfileNameAction(fullName: string) {
  const parsed = nameSchema.safeParse(fullName);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid name' };
  }
  const user = await getUser();
  if (!user) return { ok: false as const, error: 'Sign in first.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data })
    .eq('id', user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/account');
  revalidatePath('/hunt');
  revalidatePath('/hunt/leaderboard');
  return { ok: true as const };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/');
}

export async function deleteMyAccountAction() {
  const user = await getUser();
  if (!user) return { ok: false as const, error: 'Not signed in.' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[account] deleteUser failed:', error);
    return { ok: false as const, error: error.message };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  revalidatePath('/hunt');
  revalidatePath('/hunt/leaderboard');
  redirect('/');
}
