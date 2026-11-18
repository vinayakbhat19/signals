import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

export interface AuthProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: UserRole;
  college_verified: boolean;
  leaderboard_hidden: boolean;
}

export async function getUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<AuthProfile | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, email, role, college_verified, leaderboard_hidden'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (error.message.includes('leaderboard_hidden')) {
      const fallback = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, role, college_verified')
        .eq('id', user.id)
        .maybeSingle();
      if (!fallback.data) return null;
      return {
        ...fallback.data,
        role: fallback.data.role as UserRole,
        leaderboard_hidden: false,
      };
    }
    console.error('[auth] getProfile failed:', error.message);
    return null;
  }

  if (!data) return null;
  return {
    ...data,
    role: data.role as UserRole,
    leaderboard_hidden: Boolean(data.leaderboard_hidden),
  };
}

export async function requireUser(nextPath = '/') {
  const user = await getUser();
  if (!user) {
    const safeNext =
      nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }
  return user;
}

/**
 * If an organiser/admin has enrolled TOTP MFA, ensure their session is at aal2.
 * If they haven't enrolled yet, allow access so they can enrol at /account/security.
 */
async function ensureMfaIfEnrolled(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      redirect('/account/security?verify=1');
    }
  } catch {
    // Allow if MFA API unavailable on local/offline check
  }
}

export async function requireRole(
  role: 'organiser' | 'host' | 'volunteer',
  eventId?: string
): Promise<AuthProfile> {
  const profile = await getProfile();
  if (!profile) {
    notFound();
  }

  if (role === 'organiser') {
    if (!['organiser', 'admin'].includes(profile.role)) {
      notFound();
    }
    await ensureMfaIfEnrolled();
    return profile;
  }

  if (role === 'volunteer') {
    if (!['volunteer', 'scorer', 'organiser', 'admin'].includes(profile.role)) {
      notFound();
    }
    return profile;
  }

  // role === 'host'
  if (['organiser', 'admin'].includes(profile.role)) {
    return profile;
  }

  const supabase = await createClient();
  if (eventId) {
    // Check via DB function is_event_host() which also enforces hosts_until
    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          args: { p_event: string }
        ) => Promise<{ data: boolean | null; error: { code?: string } | null }>;
      }
    ).rpc('is_event_host', { p_event: eventId });

    if (!error && data === true) {
      return profile;
    }

    // Fallback check if schema_ops/schema_participants not yet applied
    if (error?.code === '42883' || error?.code === 'PGRST202') {
      const { data: hostRow } = await supabase
        .from('event_hosts')
        .select('event_id')
        .eq('event_id', eventId)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (hostRow) return profile;
    }

    notFound();
  }

  // Host hub (/host): check if user hosts at least one event AND hosts_until not passed
  const { data: cfg } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: number) => {
            maybeSingle: () => Promise<{
              data: { hosts_until?: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from('app_config')
    .select('hosts_until')
    .eq('id', 1)
    .maybeSingle();

  if (cfg?.hosts_until && new Date() > new Date(cfg.hosts_until)) {
    notFound();
  }

  const { data: hostRows } = await supabase
    .from('event_hosts')
    .select('event_id')
    .eq('user_id', profile.id)
    .limit(1);

  if (!hostRows || hostRows.length === 0) {
    notFound();
  }

  return profile;
}

export async function requireVolunteer(): Promise<AuthProfile> {
  return requireRole('volunteer');
}

export async function requireOrganiser(): Promise<AuthProfile> {
  return requireRole('organiser');
}
