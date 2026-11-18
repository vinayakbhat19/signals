'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Compass,
  Cookie,
  HelpCircle,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    profile,
    loading,
    isOrganiser,
    isHost,
    isVolunteer,
    refresh,
  } = useAuth();

  const [name, setName] = useState('');
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const raf = window.requestAnimationFrame(() => {
      setName(profile.full_name ?? '');
      setHidden(profile.leaderboard_hidden);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-12 text-center space-y-4">
        <h1 className="font-display text-3xl text-[#F4F2FA]">MY ACCOUNT</h1>
        <p className="text-sm text-[#BDB8CF]">
          Sign in with Google or email to play the Treasure Hunt, vote live, and
          manage alerts.
        </p>
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href="/login/?next=/account/"
            className="flex h-12 items-center justify-center rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
          >
            Log in / Continue with Google
          </Link>
          <Link
            href="/signup/"
            className="flex h-11 items-center justify-center rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-xs font-bold text-[#F4F2FA]"
          >
            Create account with email
          </Link>
        </div>
      </div>
    );
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Display name saved!');
      await refresh();
    }
  }

  async function handleToggleHidden(next: boolean) {
    if (!user) return;
    setHidden(next);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ leaderboard_hidden: next })
      .eq('id', user.id);
    if (error) {
      setHidden(!next);
      toast.error(error.message);
    } else {
      toast.success(next ? 'Hidden from leaderboard.' : 'Visible on leaderboard.');
      await refresh();
    }
  }

  async function handleSignOut(allDevices = false) {
    const supabase = createClient();
    await supabase.auth.signOut(allDevices ? { scope: 'global' } : undefined);
    toast.success(allDevices ? 'Signed out on all devices.' : 'Signed out.');
    router.push('/');
  }

  async function handleDeleteAccount() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('delete_my_account');
    setSaving(false);
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      const msg =
        (data as { message?: string } | null)?.message ||
        error?.message ||
        'Could not delete account.';
      toast.error(msg);
      return;
    }
    await supabase.auth.signOut();
    toast.success('Account and personal data deleted.');
    router.push('/');
  }

  function reopenCookieSheet() {
    try {
      localStorage.removeItem('fiesta26_cookie_choice');
      window.location.reload();
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-1">
        <span className="inline-block rounded-full bg-[#2A1840] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#FFD60A]">
          {profile?.role || 'student'}
        </span>
        <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
          {profile?.full_name || 'Student'}
        </h1>
        <p className="text-xs text-[#9C97B0]">{user.email}</p>
      </header>

      {/* Role Shortcuts */}
      <div className="space-y-2.5">
        {isOrganiser && (
          <Link
            href="/admin/"
            className="flex min-h-13 items-center justify-between rounded-[18px] bg-[#FFD60A] px-4 py-3 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="size-5" />
              Open Admin Control Room
            </span>
            <span>→</span>
          </Link>
        )}
        {isHost && (
          <Link
            href="/host/"
            className="flex min-h-12 items-center justify-between rounded-[18px] border border-[#FFD60A]/60 bg-[#1F1230] px-4 py-3 text-sm font-extrabold text-[#FFD60A]"
          >
            <span className="flex items-center gap-2.5">
              <Users className="size-5" />
              Host Dashboard (My Events)
            </span>
            <span>→</span>
          </Link>
        )}
        {isVolunteer && (
          <Link
            href="/volunteer/"
            className="flex min-h-12 items-center justify-between rounded-[18px] border border-[#22D3EE]/60 bg-[#1F1230] px-4 py-3 text-sm font-extrabold text-[#22D3EE]"
          >
            <span className="flex items-center gap-2.5">
              <Compass className="size-5" />
              Volunteer Hub (Stickers &amp; Prize Desk)
            </span>
            <span>→</span>
          </Link>
        )}
      </div>

      {/* Edit Name */}
      <form
        onSubmit={handleSaveName}
        className="space-y-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4"
      >
        <label className="block text-xs font-extrabold uppercase text-[#9C97B0]">
          Display name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 flex-1 rounded-[12px] border border-[#3B2758] bg-[#12091E] px-3.5 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-[12px] bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>

      {/* Settings Links */}
      <div className="space-y-1.5 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-2">
        <label className="flex min-h-12 items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-[#2A1840]">
          <span>Hide me from the leaderboard</span>
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => void handleToggleHidden(e.target.checked)}
            className="size-5 accent-[#FFD60A]"
          />
        </label>
        <Link
          href="/account/permissions/"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <Bell className="size-4 text-[#FFE14D]" />
          Alerts &amp; camera permissions
        </Link>
        <Link
          href="/account/security/"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <ShieldCheck className="size-4 text-[#FF4FD8]" />
          Security &amp; 2FA
        </Link>
        <button
          type="button"
          onClick={reopenCookieSheet}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-[#2A1840] cursor-pointer"
        >
          <Cookie className="size-4 text-[#FFD60A]" />
          Cookies &amp; privacy settings
        </button>
        <Link
          href="/install/"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <Smartphone className="size-4 text-[#22D3EE]" />
          Add Fiesta&apos;26 Live to Home Screen
        </Link>
        <Link
          href="/about/"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <HelpCircle className="size-4 text-[#9B6CFF]" />
          About &amp; committee help
        </Link>
      </div>

      {/* Sign out & Delete */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => void handleSignOut(false)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#3B2758] bg-[#1F1230] text-xs font-extrabold text-[#F4F2FA] cursor-pointer"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-10 w-full items-center justify-center gap-1.5 text-xs font-bold text-[#FF4F5E] cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            Delete my account &amp; data
          </button>
        ) : (
          <div className="rounded-2xl border border-[#FF4F5E] bg-[#FF4F5E]/10 p-4 space-y-2.5 text-xs">
            <p className="font-bold text-[#FF9EA7]">
              This permanently removes your profile, Treasure Hunt stamps, and
              votes. Continue?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDeleteAccount()}
                className="h-10 flex-1 rounded-xl bg-[#FF4F5E] font-extrabold text-white cursor-pointer"
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-10 rounded-xl border border-[#3B2758] px-4 font-bold text-[#F4F2FA] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
