'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

export interface BrowserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: UserRole;
  leaderboard_hidden: boolean;
}

export interface AuthState {
  user: User | null;
  profile: BrowserProfile | null;
  hostedEventIds: string[];
  canMakeQr: boolean;
  loading: boolean;
  isOrganiser: boolean;
  isAdmin: boolean;
  isVolunteer: boolean;
  isHost: boolean;
  refresh: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<BrowserProfile | null>(null);
  const [hostedEventIds, setHostedEventIds] = useState<string[]>([]);
  const [canMakeQr, setCanMakeQr] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setHostedEventIds([]);
        setCanMakeQr(false);
        setLoading(false);
        return;
      }

      const [profRes, hostRes, qrRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, role, leaderboard_hidden')
          .eq('id', currentUser.id)
          .maybeSingle(),
        supabase
          .from('event_hosts')
          .select('event_id')
          .eq('user_id', currentUser.id),
        supabase.rpc('can_make_qr'),
      ]);

      if (profRes.data) {
        setProfile({
          id: profRes.data.id,
          full_name: profRes.data.full_name,
          avatar_url: profRes.data.avatar_url,
          email: profRes.data.email,
          role: (profRes.data.role as UserRole) || 'student',
          leaderboard_hidden: Boolean(profRes.data.leaderboard_hidden),
        });
      } else {
        setProfile({
          id: currentUser.id,
          full_name:
            (currentUser.user_metadata?.full_name as string | undefined) ?? null,
          avatar_url:
            (currentUser.user_metadata?.avatar_url as string | undefined) ?? null,
          email: currentUser.email ?? null,
          role: 'student',
          leaderboard_hidden: false,
        });
      }

      const ids = (hostRes.data ?? []).map((r) => String(r.event_id));
      setHostedEventIds(ids);
      setCanMakeQr(Boolean(qrRes.data));
    } catch {
      // Keep graceful state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void load());
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      window.cancelAnimationFrame(raf);
      subscription.unsubscribe();
    };
  }, [load]);

  const role = profile?.role ?? 'student';
  const isAdmin = role === 'admin';
  const isOrganiser = role === 'organiser' || role === 'admin';
  const isVolunteer =
    role === 'volunteer' || role === 'scorer' || isOrganiser;
  const isHost = hostedEventIds.length > 0 || isOrganiser;

  return {
    user,
    profile,
    hostedEventIds,
    canMakeQr: canMakeQr || isVolunteer || isHost,
    loading,
    isOrganiser,
    isAdmin,
    isVolunteer,
    isHost,
    refresh: load,
  };
}
