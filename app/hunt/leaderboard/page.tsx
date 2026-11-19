'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
  Footprints,
  HelpCircle,
  Lock,
  Medal,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

interface LeaderRow {
  user_id: string;
  display_name: string;
  stamps: number;
  score: number;
  last_scan: string;
}

export default function HuntLeaderboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load leaderboard from Supabase
  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('stamp_leaderboard')
        .select('user_id, display_name, stamps, score, last_scan')
        .order('score', { ascending: false })
        .order('last_scan', { ascending: true })
        .limit(100);
      if (active) {
        if (data) setRows(data as LeaderRow[]);
        setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  // Compute current user's rank & stats if logged in
  const myRankIdx = user ? rows.findIndex((r) => r.user_id === user.id) : -1;
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;
  const myRow = myRankIdx >= 0 ? rows[myRankIdx] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/hunt/"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA] hover:border-[#FFD60A] transition-colors"
            aria-label="Back to Treasure Hunt"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl text-[#F4F2FA] sm:text-3xl">
              <Trophy className="size-7 text-[#FFE14D]" />
              HUNT LEADERBOARD
            </h1>
            <p className="text-xs text-[#9C97B0]">
              Live campus rankings · Refreshes automatically every 30 s
            </p>
          </div>
        </div>
        <Link
          href="/scan/"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E] shadow-[3px_3px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
        >
          <QrCode className="size-4" />
          Scan
        </Link>
      </div>

      {/* 1. Join the Hunt / Start by Login Banner */}
      {!user ? (
        <section className="relative overflow-hidden rounded-[26px] border-[1.5px] border-[#9B6CFF] bg-[#1F1230] p-6 text-center space-y-4 shadow-[5px_5px_0_#FFD60A]">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4FD8]/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FF4FD8]">
              <Sparkles className="size-3.5" />
              WANT TO JOIN THE HUNT?
            </span>
            <h2 className="font-heading text-2xl font-extrabold text-[#F4F2FA] sm:text-3xl">
              Start by logging in!
            </h2>
            <p className="mx-auto max-w-lg text-sm text-[#BDB8CF]">
              10 secret spots are hidden across the campus. Sign in with your
              account to unlock <strong>Clue #1</strong>. Find the secret QR
              sticker, scan it to collect your stamp, and automatically unlock{' '}
              <strong>Clue #2</strong>!
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-1">
            <Link
              href="/login/?next=/hunt/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-6 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
            >
              <Sparkles className="size-4" />
              Log in to Start Hunt
            </Link>
            <Link
              href="/signup/"
              className="inline-flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-[#3B2758] bg-[#12091E] px-6 text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A] transition-colors"
            >
              Create free account
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] bg-[#9B6CFF] p-5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider">
                {profile?.full_name || 'YOUR HUNTER PASSPORT'}
              </p>
              <p className="font-heading text-3xl font-extrabold leading-none mt-1">
                {myRow ? `${myRow.score} pts` : '0 pts'}
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] font-extrabold uppercase">STAMPS</p>
                <p className="font-heading text-2xl font-extrabold leading-none">
                  {myRow ? `${myRow.stamps}/10` : '0/10'}
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

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#12091E]/20">
            <span className="text-xs font-bold text-[#12091E]/80">
              {myRow && myRow.stamps >= 10
                ? '🎉 All 10 clues solved!'
                : `Next: Clue #${(myRow?.stamps ?? 0) + 1} is waiting!`}
            </span>
            <Link
              href="/hunt/"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#12091E] px-4 text-xs font-extrabold text-[#FFD60A] shadow-[2px_2px_0_#FF4FD8]"
            >
              Open My Clues
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>
      )}

      {/* 2. Live Rankings Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
            <Trophy className="size-5 text-[#FFE14D]" />
            Live Rankings
          </h2>
          <span className="text-xs text-[#9C97B0]">
            {rows.length} {rows.length === 1 ? 'hunter' : 'hunters'} on board
          </span>
        </div>

        {loading ? (
          <div className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-8 text-center text-sm text-[#9C97B0]">
            Loading leaderboard standings…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-[#F4F2FA]">
              No stamps collected yet.
            </p>
            <p className="text-xs text-[#9C97B0]">
              Be the very first hunter to log in, solve Clue #1, and claim the
              #1 spot!
            </p>
            <Link
              href="/hunt/"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
            >
              <Compass className="size-4" />
              Start Clue #1
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r, idx) => {
              const isMe = user && r.user_id === user.id;
              const isGold = idx === 0;
              const isSilver = idx === 1;
              const isBronze = idx === 2;

              return (
                <div
                  key={r.user_id}
                  className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm transition-all ${
                    isMe
                      ? 'border-[#FFD60A] bg-[#FFD60A]/15 text-[#FFD60A] shadow-[0_0_15px_rgba(255,214,10,0.15)]'
                      : isGold
                        ? 'border-[#FFD60A] bg-[#FFD60A]/10 text-[#F4F2FA]'
                        : isSilver
                          ? 'border-[#C0C0C0]/70 bg-[#1F1230] text-[#F4F2FA]'
                          : isBronze
                            ? 'border-[#CD7F32]/70 bg-[#1F1230] text-[#F4F2FA]'
                            : 'border-[#3B2758] bg-[#1F1230]/80 text-[#F4F2FA]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-heading text-sm font-extrabold ${
                        isGold
                          ? 'bg-[#FFD60A] text-[#12091E]'
                          : isSilver
                            ? 'bg-[#E0E0E0] text-[#12091E]'
                            : isBronze
                              ? 'bg-[#CD7F32] text-[#12091E]'
                              : 'bg-[#12091E] text-[#9C97B0] border border-[#3B2758]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-sm text-[#F4F2FA]">
                        {r.display_name}
                        {isMe && (
                          <span className="ml-1.5 rounded bg-[#FFD60A] px-1.5 py-0.5 text-[10px] font-black text-[#12091E]">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#9C97B0]">
                        {r.stamps} / 10 stamps collected
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block font-heading text-base font-extrabold text-[#FFD60A]">
                      {r.score} pts
                    </span>
                    {r.stamps === 10 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#22D3EE]">
                        <CheckCircle2 className="size-3" />
                        COMPLETED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Detailed About the Hunt Section (BELOW LEADERBOARD) */}
      <section className="rounded-[26px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-6 space-y-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#FFD60A]">
            <Compass className="size-3.5" />
            GAME GUIDE &amp; RULES
          </span>
          <h2 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
            About the Campus Treasure Hunt
          </h2>
          <p className="text-xs text-[#BDB8CF] leading-relaxed">
            The Fiesta&apos;26 Treasure Hunt is an interactive campus adventure
            spanning 10 hidden physical QR stickers placed at famous landmarks
            across the SDMCET campus.
          </p>
        </div>

        {/* Step-by-Step Walkthrough */}
        <div className="space-y-3">
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider text-[#FF4FD8]">
            How to Play (5 Easy Steps)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFD60A] text-xs font-black text-[#12091E]">
                1
              </span>
              <h4 className="font-heading text-sm font-extrabold text-[#F4F2FA]">
                Log in to Unlock
              </h4>
              <p className="text-xs text-[#9C97B0] leading-normal">
                Signing in gives you your digital passport and instantly reveals{' '}
                <strong className="text-[#F4F2FA]">Clue #1</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFD60A] text-xs font-black text-[#12091E]">
                2
              </span>
              <h4 className="font-heading text-sm font-extrabold text-[#F4F2FA]">
                Decipher the Riddle
              </h4>
              <p className="text-xs text-[#9C97B0] leading-normal">
                Read the cryptic clue describing the hidden campus spot. Stuck?
                Tap &ldquo;Need a hint?&rdquo; for an extra clue.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFD60A] text-xs font-black text-[#12091E]">
                3
              </span>
              <h4 className="font-heading text-sm font-extrabold text-[#F4F2FA]">
                Find the QR Sticker
              </h4>
              <p className="text-xs text-[#9C97B0] leading-normal">
                Walk to the spot on campus and look for the yellow Fiesta&apos;26
                QR sticker featuring our mascot characters.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 space-y-1.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#FFD60A] text-xs font-black text-[#12091E]">
                4
              </span>
              <h4 className="font-heading text-sm font-extrabold text-[#F4F2FA]">
                Scan to Unlock Next
              </h4>
              <p className="text-xs text-[#9C97B0] leading-normal">
                Tap the big yellow <strong className="text-[#FFD60A]">SCAN</strong> button.
                Scanning awards +10 pts and immediately unlocks the next clue in sequence!
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#9B6CFF] bg-[#9B6CFF]/15 p-4 flex items-start gap-3">
            <Award className="size-6 shrink-0 text-[#FFD60A] mt-0.5" />
            <div>
              <h4 className="font-heading text-sm font-extrabold text-[#F4F2FA]">
                5. Complete All 10 &amp; Win
              </h4>
              <p className="text-xs text-[#CFCBDD] leading-normal mt-0.5">
                Collect all 10 stamps to receive a huge{' '}
                <strong className="text-[#FFD60A]">+20 bonus points</strong> (120 pts total)
                and take top honors at the Valedictory prize ceremony!
              </p>
            </div>
          </div>
        </div>

        {/* Scoring & Tiebreaker */}
        <div className="space-y-3 border-t border-[#3B2758] pt-5">
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider text-[#22D3EE]">
            Points &amp; Tiebreaker Rules
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-center">
              <span className="block font-heading text-xl font-extrabold text-[#FFD60A]">
                +10 PTS
              </span>
              <span className="text-[11px] text-[#9C97B0]">
                Per stamp collected
              </span>
            </div>
            <div className="rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-center">
              <span className="block font-heading text-xl font-extrabold text-[#FF4FD8]">
                +20 PTS
              </span>
              <span className="text-[11px] text-[#9C97B0]">
                Bonus for all 10
              </span>
            </div>
            <div className="rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-center">
              <span className="block font-heading text-xl font-extrabold text-[#22D3EE]">
                120 PTS
              </span>
              <span className="text-[11px] text-[#9C97B0]">
                Maximum score
              </span>
            </div>
          </div>
          <p className="text-xs text-[#9C97B0]">
            ⚡ <strong>Tiebreaker Rule:</strong> In case of score ties, rankings
            are strictly decided by the <em>earliest timestamp</em> of the final
            scan. The faster you finish, the higher you rank!
          </p>
        </div>

        {/* Fair Play Rules */}
        <div className="space-y-2 border-t border-[#3B2758] pt-5">
          <h3 className="flex items-center gap-1.5 font-heading text-sm font-extrabold uppercase tracking-wider text-[#FFD60A]">
            <ShieldCheck className="size-4 text-[#FFD60A]" />
            Fair Play &amp; Safety
          </h3>
          <ul className="space-y-1.5 text-xs text-[#BDB8CF] list-disc list-inside">
            <li>
              All stickers are placed at eye level in safe, public student areas.
              Do not climb or enter restricted spots.
            </li>
            <li>
              Do <strong>NOT</strong> damage, cover, or peel stickers so every
              student has an equal chance to play.
            </li>
            <li>
              Only one account per participant. Sharing QR photos is not permitted.
            </li>
            <li>
              Questions or sticker issues? Ask any volunteer at the Fiesta Help Desk.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
