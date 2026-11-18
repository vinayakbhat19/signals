'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOrganiser } from '@/lib/auth';
import { mapDbError } from '@/lib/modes';
import { createClient } from '@/lib/supabase/server';

const InviteSchema = z.object({
  eventId: z.string().uuid('Select a valid event.'),
  email: z.string().trim().email('Enter a valid email address.').max(120),
});

export async function inviteHostAction(
  eventId: string,
  email: string
) {
  await requireOrganiser();
  const parsed = InviteSchema.safeParse({ eventId, email });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid input.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: { p_event: string; p_email: string }
      ) => Promise<{
        data: {
          ok?: boolean;
          status?: 'active' | 'invited';
          message?: string;
        } | null;
        error: { code?: string; message?: string } | null;
      }>;
    }
  ).rpc('invite_host', {
    p_event: parsed.data.eventId,
    p_email: parsed.data.email.toLowerCase(),
  });

  if (error) {
    return {
      ok: false as const,
      error: mapDbError(
        error,
        'Run supabase/schema_ops.sql in Supabase first to enable host invites.'
      ),
    };
  }

  if (!data?.ok) {
    return {
      ok: false as const,
      error: data?.message || 'Could not save host invite.',
    };
  }

  revalidatePath('/admin/hosts');
  return {
    ok: true as const,
    status: data.status || 'invited',
    shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login?next=/host`,
  };
}

export async function removeHostAction(eventId: string, userId: string) {
  await requireOrganiser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('event_hosts')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/hosts');
  return { ok: true as const };
}

export async function cancelHostInviteAction(inviteId: string) {
  await requireOrganiser();
  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (k: string, v: string) => Promise<{
            error: { message?: string } | null;
          }>;
        };
      };
    }
  )
    .from('host_invites')
    .delete()
    .eq('id', inviteId);
  if (error) return { ok: false as const, error: error.message || 'Delete failed' };
  revalidatePath('/admin/hosts');
  return { ok: true as const };
}

export async function inviteVolunteerAction(email: string) {
  await requireOrganiser();
  const parsed = z.string().trim().email('Enter a valid email address.').max(120).safeParse(email);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || 'Invalid email.' };
  }

  const supabase = await createClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: { p_email: string }
      ) => Promise<{
        data: { ok?: boolean; status?: 'active' | 'invited'; message?: string } | null;
        error: { code?: string; message?: string } | null;
      }>;
    }
  ).rpc('invite_volunteer', { p_email: parsed.data.toLowerCase() });

  if (error) {
    return {
      ok: false as const,
      error: mapDbError(
        error,
        'Run supabase/UPGRADE_HUNT_AND_HOSTS.sql first to enable volunteer invites.'
      ),
    };
  }
  if (!data?.ok) {
    return { ok: false as const, error: data?.message || 'Could not invite volunteer.' };
  }

  revalidatePath('/admin/hosts');
  return { ok: true as const, status: data.status || 'invited' };
}

export async function cancelVolunteerInviteAction(email: string) {
  await requireOrganiser();
  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
        };
      };
    }
  )
    .from('staff_invites')
    .delete()
    .eq('email', email);
  if (error) return { ok: false as const, error: error.message || 'Cancel failed' };
  revalidatePath('/admin/hosts');
  return { ok: true as const };
}
