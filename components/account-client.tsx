'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Cookie,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteMyAccountAction,
  signOutAction,
  updateProfileNameAction,
} from '@/app/account/actions';
import { toggleLeaderboardHiddenAction } from '@/app/hunt/actions';
import { openCookieNotice } from '@/components/cookie-sheet';
import type { AuthProfile } from '@/lib/auth';

interface AccountClientProps {
  profile: AuthProfile;
  stampsCount: number;
  totalStamps: number;
  huntRank: number | null;
  votesCount: number;
}

export function AccountClient({
  profile,
  stampsCount,
  totalStamps,
  huntRank,
  votesCount,
}: AccountClientProps) {
  const [name, setName] = useState(profile.full_name ?? '');
  const [hidden, setHidden] = useState(profile.leaderboard_hidden);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initials = (profile.full_name || profile.email || 'F')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const isOrganiser =
    profile.role === 'organiser' || profile.role === 'admin';

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfileNameAction(name);
      if (!res.ok) toast.error(res.error);
      else toast.success('Name updated');
    });
  }

  function handleToggleHidden(next: boolean) {
    setHidden(next);
    startTransition(async () => {
      const res = await toggleLeaderboardHiddenAction(next);
      if (!res.ok) {
        setHidden(!next);
        toast.error(res.error);
      } else {
        toast.success(next ? 'Hidden from leaderboard' : 'Visible on leaderboard');
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-6">
      <h1 className="font-display text-3xl text-[#F4F2FA]">MY ACCOUNT</h1>

      {/* Profile card */}
      <section className="flex items-center gap-4 rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-[#FF4FD8] font-heading text-xl font-extrabold text-[#12091E]">
          {initials}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-heading text-lg font-extrabold text-[#F4F2FA]">
              {profile.full_name || 'Student'}
            </span>
            {profile.college_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD60A] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                <BadgeCheck className="size-3" /> VERIFIED
              </span>
            )}
            {profile.role !== 'student' && (
              <span className="rounded-full bg-[#9B6CFF] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#12091E]">
                {profile.role}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-[#BDB8CF]">{profile.email}</p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2.5">
        <Link
          href="/hunt"
          className="rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-3.5 text-center"
        >
          <div className="font-heading text-2xl font-extrabold text-[#FFD60A]">
            {stampsCount}/{totalStamps}
          </div>
          <div className="text-[11px] font-bold text-[#9C97B0]">STAMPS</div>
        </Link>
        <Link
          href="/hunt/leaderboard"
          className="rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-3.5 text-center"
        >
          <div className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
            {huntRank ? `#${huntRank}` : '—'}
          </div>
          <div className="text-[11px] font-bold text-[#9C97B0]">RANK</div>
        </Link>
        <Link
          href="/vote"
          className="rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-3.5 text-center"
        >
          <div className="font-heading text-2xl font-extrabold text-[#FF4FD8]">
            {votesCount}
          </div>
          <div className="text-[11px] font-bold text-[#9C97B0]">VOTES</div>
        </Link>
      </section>

      {/* Organiser panel shortcut */}
      {isOrganiser && (
        <Link
          href="/admin"
          className="flex min-h-14 items-center justify-between rounded-[20px] bg-[#FFD60A] px-4 py-3 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
        >
          <span className="flex items-center gap-2.5">
            <ShieldCheck className="size-5" />
            Open Organiser Control Room
          </span>
          <span>→</span>
        </Link>
      )}

      {/* Edit Name */}
      <form
        onSubmit={handleSaveName}
        className="space-y-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4"
      >
        <label
          htmlFor="acc-name"
          className="block text-xs font-extrabold uppercase tracking-wider text-[#9C97B0]"
        >
          Display name
        </label>
        <div className="flex gap-2">
          <input
            id="acc-name"
            type="text"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 flex-1 rounded-[12px] border border-[#3B2758] bg-[#12091E] px-3.5 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="h-11 rounded-[12px] bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>

      {/* Preferences & Links */}
      <div className="space-y-2 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-2">
        <label className="flex min-h-12 items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-[#2A1840]">
          <span>Hide me from the leaderboard</span>
          <input
            type="checkbox"
            checked={hidden}
            disabled={isPending}
            onChange={(e) => handleToggleHidden(e.target.checked)}
            className="size-5 accent-[#FFD60A]"
          />
        </label>

        <Link
          href="/account/permissions"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <Smartphone className="size-4 text-[#FFE14D]" />
          Alerts &amp; camera permissions
        </Link>

        <Link
          href="/account/security"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <ShieldCheck className="size-4 text-[#FF4FD8]" />
          Security, 2FA &amp; active sessions
        </Link>

        <button
          type="button"
          onClick={openCookieNotice}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-[#2A1840] cursor-pointer"
        >
          <Cookie className="size-4 text-[#FFD60A]" />
          Cookies &amp; privacy settings
        </button>

        <Link
          href="/install"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <Smartphone className="size-4 text-[#22D3EE]" />
          Add Fiesta&apos;26 Live to Home Screen
        </Link>

        <Link
          href="/about"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#2A1840]"
        >
          <HelpCircle className="size-4 text-[#9B6CFF]" />
          About &amp; committee help
        </Link>
      </div>

      {/* Sign out & Delete */}
      <div className="space-y-2.5 pt-2">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A] cursor-pointer"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-11 w-full items-center justify-center gap-2 text-xs font-bold text-[#FF7D88] cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            Delete my account and data
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-[#FF4F5E] bg-[#FF4F5E]/15 p-4 text-xs">
            <p className="font-bold text-[#F4F2FA]">
              Permanently delete your account, stamps, and votes?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteMyAccountAction();
                    if (res && !res.ok) toast.error(res.error);
                  })
                }
                className="flex-1 h-10 rounded-xl bg-[#FF4F5E] font-extrabold text-[#12091E] cursor-pointer"
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
