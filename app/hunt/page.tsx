'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronRight,
  Compass,
  HelpCircle,
  Lock,
  QrCode,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { StampMascotSvg } from '@/components/stamp-mascots';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';
import { formatTime } from '@/lib/time';
import type { StampMascot } from '@/lib/types';

interface ClueItem {
  sort: number;
  point_id: string;
  mascot: string;
  found: boolean;
  found_at: string | null;
  points: number | null;
  clue: string | null;
  hint: string | null;
  place: string | null;
  found_text: string | null;
  locked: boolean;
}

interface LeaderRow {
  user_id: string;
  display_name: string;
  stamps: number;
  score: number;
  last_scan: string;
}

export default function HuntPage() {
  const { user, profile, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [huntName, setHuntName] = useState('Fiesta Treasure Hunt');
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const [stampValue, setStampValue] = useState(10);
  const [completeBonus, setCompleteBonus] = useState(20);
  const [clues, setClues] = useState<ClueItem[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [hintsOpen, setHintsOpen] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const raf = window.requestAnimationFrame(() =>
      setHidden(profile.leaderboard_hidden)
    );
    return () => window.cancelAnimationFrame(raf);
  }, [profile]);

  const loadHunt = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [cfgRes, clueRes, lbRes] = await Promise.all([
      supabase
        .from('stamp_hunt')
        .select('name, closes_at, stamp_value, complete_bonus')
        .eq('id', 1)
        .maybeSingle(),
      supabase.rpc('my_hunt'),
      supabase
        .from('stamp_leaderboard')
        .select('user_id, display_name, stamps, score, last_scan')
        .order('score', { ascending: false })
        .order('last_scan', { ascending: true })
        .limit(50),
    ]);

    if (cfgRes.data) {
      setHuntName(cfgRes.data.name || 'Fiesta Treasure Hunt');
      setClosesAt(cfgRes.data.closes_at ?? null);
      setStampValue(cfgRes.data.stamp_value ?? 10);
      setCompleteBonus(cfgRes.data.complete_bonus ?? 20);
    }
    if (Array.isArray(clueRes.data)) {
      setClues(clueRes.data as ClueItem[]);
    }
    if (Array.isArray(lbRes.data)) {
      setLeaders(lbRes.data as LeaderRow[]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const raf = window.requestAnimationFrame(() => void loadHunt());
    // Refresh leaderboard every 30 s (HOSTING_CLOUDFLARE.md §3.4)
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadHunt();
    }, 30_000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [loadHunt, user]);

  async function toggleHidden(next: boolean) {
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
      toast.success(
        next ? 'Hidden from public leaderboard.' : 'Visible on leaderboard.'
      );
      await refreshAuth();
      await loadHunt();
    }
  }

  const foundCount = clues.filter((c) => c.found).length;
  const totalCount = clues.length;
  const basePts = clues.reduce((acc, c) => acc + (c.points ?? 0), 0);
  const myScore =
    basePts + (totalCount > 0 && foundCount >= totalCount ? completeBonus : 0);
  const myRankIdx = user ? leaders.findIndex((l) => l.user_id === user.id) : -1;
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;

  if (authLoading) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center text-sm text-[#BDB8CF]">
        Loading Treasure Hunt…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-4">
        <section className="rounded-[26px] border-[1.5px] border-[#9B6CFF] bg-[#1F1230] p-6 text-center space-y-4 shadow-[5px_5px_0_#FFD60A]">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#9B6CFF]/20 text-[#FFD60A]">
            <Lock className="size-8" />
          </span>
          <div className="space-y-1.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF4FD8]">
              FIESTA&apos;26 TREASURE HUNT
            </p>
            <h1 className="font-display text-3xl leading-tight text-[#F4F2FA]">
              LOG IN TO UNLOCK
            </h1>
            <p className="text-sm text-[#BDB8CF]">
              Treasure Hunt clues, hidden spots, and the live leaderboard are
              unlocked once you sign in with your Fiesta&apos;26 account.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/login/?next=/hunt/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-6 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
            >
              <Sparkles className="size-4" />
              Log in to play
            </Link>
            <Link
              href="/signup/"
              className="inline-flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-[#3B2758] bg-[#12091E] px-6 text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A]"
            >
              Create account
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#9B6CFF]/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-[#9B6CFF]">
            <Compass className="size-3.5" />
            CAMPUS TREASURE HUNT
          </span>
          <h1 className="mt-1 font-display text-3xl leading-none text-[#F4F2FA] sm:text-4xl">
            {huntName.toUpperCase()}
          </h1>
          <p className="mt-1.5 text-xs text-[#BDB8CF]">
            Read a clue, find the hidden spot, scan the QR sticker. +{stampValue}{' '}
            per place · +{completeBonus} bonus for all {totalCount || 10}!
          </p>
        </div>
        <Link
          href="/scan/"
          aria-label="Scan sticker QR"
          className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-[#FFD60A] text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
        >
          <QrCode className="size-6 stroke-[2.3]" />
        </Link>
      </header>

      {user ? (
        <section className="rounded-[24px] bg-[#9B6CFF] p-5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase">
                {profile?.full_name || 'YOUR PASSPORT'}
              </p>
              <p className="font-heading text-3xl font-extrabold leading-none mt-1">
                {myScore} pts
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] font-extrabold uppercase">FOUND</p>
                <p className="font-heading text-2xl font-extrabold leading-none">
                  {foundCount}/{totalCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase">RANK</p>
                <p className="font-heading text-2xl font-extrabold leading-none">
                  {myRank ? `#${myRank}` : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#12091E]/25">
            <div
              className="h-full rounded-full bg-[#FFD60A] transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/scan/"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#12091E] px-4 text-xs font-extrabold text-[#FFD60A]"
            >
              <QrCode className="size-4" />
              Scan sticker to collect
            </Link>
            {closesAt && (
              <span className="text-xs font-extrabold">
                Closes {formatTime(closesAt)} IST
              </span>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] bg-[#9B6CFF] p-5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] space-y-3">
          <p className="text-[11px] font-extrabold uppercase">
            FREE TO PLAY · GOOGLE OR EMAIL
          </p>
          <h2 className="font-heading text-2xl font-extrabold leading-tight">
            Find {totalCount || 10} hidden spots across SDMCET &amp; win prizes!
          </h2>
          <Link
            href="/login/?next=/hunt/"
            className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] shadow-[3px_3px_0_#12091E]"
          >
            <Sparkles className="size-4" />
            Join the Treasure Hunt →
          </Link>
        </section>
      )}

      {/* Clues */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
          Campus Clues ({foundCount}/{totalCount})
        </h2>
        {clues.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-6 text-center text-sm text-[#9C97B0]">
            Run <code>supabase/UPGRADE_CLOUDFLARE_STATIC.sql</code> to publish
            the 10 Treasure Hunt clues!
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {clues.map((item) => {
              const showHint = Boolean(hintsOpen[item.point_id]);
              return (
                <article
                  key={item.point_id}
                  className={`rounded-[22px] border-[1.5px] p-4 space-y-2.5 ${
                    item.found
                      ? 'border-[#FFD60A]/60 bg-[#1F1230]'
                      : 'border-[#3B2758] bg-[#1F1230]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-[14px] ${
                        item.found ? 'bg-[#2A1840]' : 'bg-[#12091E] grayscale opacity-70'
                      }`}
                    >
                      <StampMascotSvg
                        mascot={(item.mascot as StampMascot) || 'spark'}
                        size={38}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase text-[#9C97B0]">
                          CLUE #{item.sort}
                        </span>
                        {item.found ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD60A] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                            <CheckCircle2 className="size-3" />
                            +{item.points ?? 10} FOUND
                          </span>
                        ) : item.locked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#2A1840] px-2 py-0.5 text-[10px] font-extrabold text-[#9C97B0]">
                            <Lock className="size-3" />
                            LOCKED
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#FF4FD8]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#FF4FD8]">
                            HIDDEN
                          </span>
                        )}
                      </div>

                      {item.found ? (
                        <>
                          <h3 className="font-heading text-lg font-extrabold text-[#FFD60A]">
                            {item.place}
                          </h3>
                          {item.found_text && (
                            <p className="text-xs font-semibold text-[#CFCBDD]">
                              {item.found_text}
                            </p>
                          )}
                        </>
                      ) : item.locked ? (
                        <p className="text-xs text-[#9C97B0]">
                          Find the previous place to unlock this clue.
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-bold leading-snug text-[#F4F2FA]">
                            &ldquo;{item.clue}&rdquo;
                          </p>
                          {item.hint && (
                            <div className="pt-1">
                              {showHint ? (
                                <p className="rounded-xl bg-[#12091E] px-3 py-2 text-xs font-semibold text-[#22D3EE]">
                                  Hint: {item.hint}
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHintsOpen((p) => ({
                                      ...p,
                                      [item.point_id]: true,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#22D3EE] hover:underline cursor-pointer"
                                >
                                  <HelpCircle className="size-3.5" />
                                  Need a hint?
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Top 5 Leaderboard */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Trophy className="size-5 text-[#FFE14D]" />
            Top Hunters
          </h2>
          <Link
            href="/hunt/leaderboard/"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FFD60A]"
          >
            Full leaderboard
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {leaders.length === 0 ? (
          <p className="py-3 text-center text-xs text-[#9C97B0]">
            No stamps yet. Scan a hidden QR sticker to be #1!
          </p>
        ) : (
          <div className="space-y-1.5">
            {leaders.slice(0, 5).map((row, idx) => {
              const isMe = row.user_id === user?.id;
              return (
                <div
                  key={row.user_id}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm ${
                    isMe
                      ? 'border border-[#FFD60A] bg-[#FFD60A]/15 text-[#FFD60A]'
                      : 'bg-[#12091E] text-[#F4F2FA]'
                  }`}
                >
                  <span className="truncate font-bold">
                    #{idx + 1} · {row.display_name}
                    {isMe && ' (You)'}
                  </span>
                  <span className="shrink-0 font-extrabold">
                    {row.score} pts · {row.stamps} found
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {user && (
          <label className="flex items-center justify-between border-t border-[#3B2758] pt-3 text-xs font-semibold text-[#BDB8CF] cursor-pointer">
            <span>Hide me from the public leaderboard</span>
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => void toggleHidden(e.target.checked)}
              className="size-4 accent-[#FFD60A]"
            />
          </label>
        )}
      </section>
    </div>
  );
}
