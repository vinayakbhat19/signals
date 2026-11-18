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
    .select('id, full_name, avatar_url, email, role, college_verified, leaderboard_hidden')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    // Fallback if leaderboard_hidden column hasn't been added by schema_stamps.sql yet
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
    console.error('[auth] getProfile failed:', error);
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

export async function requireVolunteer(): Promise<AuthProfile> {
  const profile = await getProfile();
  if (
    !profile ||
    !['volunteer', 'scorer', 'organiser', 'admin'].includes(profile.role)
  ) {
    notFound();
  }
  return profile;
}

export async function requireOrganiser(): Promise<AuthProfile> {
  const profile = await getProfile();
  if (!profile || !['organiser', 'admin'].includes(profile.role)) {
    notFound();
  }
  return profile;
}
