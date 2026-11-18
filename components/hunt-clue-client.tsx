'use client';

import { useState, useTransition } from 'react';
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
import { toggleLeaderboardHiddenAction } from '@/app/hunt/actions';
import { StampMascotSvg } from '@/components/stamp-mascots';
import type {
  RankedLeaderboardEntry,
  TreasureClueItem,
} from '@/lib/data/hunt';
import { formatTime } from '@/lib/time';
import type { StampHunt, StampMascot } from '@/lib/types';

interface HuntClueClientProps {
  hunt: StampHunt | null;
  clues: TreasureClueItem[];
  leaderboard: RankedLeaderboardEntry[];
  userId: string | null;
  myDisplayName: string | null;
  initialHidden: boolean;
}

export function HuntClueClient({
  hunt,
  clues,
  leaderboard,
  userId,
  myDisplayName,
  initialHidden,
}: HuntClueClientProps) {
  const [hidden, setHidden] = useState(initialHidden);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const foundCount = clues.filter((c) => c.found).length;
  const totalCount = clues.length;
  const basePoints = clues.reduce((acc, c) => acc + (c.points ?? 0), 0);
  const bonusPoints =
    totalCount > 0 && foundCount >= totalCount
      ? (hunt?.complete_bonus ?? 20)
      : 0;
  const myScore = basePoints + bonusPoints;

  const myRow = userId
    ? leaderboard.find((r) => r.user_id === userId) ?? null
    : null;
  const myRank = myRow?.rank ?? null;

  function handleToggleHidden(next: boolean) {
    setHidden(next);
    startTransition(async () => {
      const res = await toggleLeaderboardHiddenAction(next);
      if (!res.ok) {
        setHidden(!next);
        toast.error(res.error);
      } else {
        toast.success(
          next ? 'Hidden from public leaderboard.' : 'Visible on leaderboard.'
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header matching 22-hunt.png */}
      <header className="flex items-start justify-between gap-3 pt-1">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#9B6CFF]/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9B6CFF]">
            <Compass className="size-3.5" aria-hidden="true" />
            CAMPUS TREASURE HUNT
          </span>
          <h1 className="mt-1 font-display text-3xl leading-none text-[#F4F2FA] sm:text-4xl">
            {hunt?.name || 'FIESTA TREASURE HUNT'}
          </h1>
          <p className="mt-1.5 text-xs text-[#BDB8CF]">
            Read a clue, find the hidden spot on campus, and scan the QR sticker
            there. +{hunt?.stamp_value ?? 10} per place · +{hunt?.complete_bonus ?? 20}{' '}
            bonus for all {totalCount || 10}!
          </p>
        </div>

        <Link
          href="/scan"
          aria-label="Scan sticker QR"
          className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-[#FFD60A] text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
        >
          <QrCode className="size-6 stroke-[2.3]" aria-hidden="true" />
        </Link>
      </header>

      {/* Player Score Card or Join CTA */}
      {userId ? (
        <section className="rounded-[24px] bg-[#9B6CFF] p-5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em]">
                {myDisplayName || 'YOUR PASSPORT'}
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
              href="/scan"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#12091E] px-4 text-xs font-extrabold text-[#FFD60A]"
            >
              <QrCode className="size-4" />
              Scan sticker to collect
            </Link>
            {hunt?.closes_at && (
              <span className="text-xs font-extrabold">
                Closes {formatTime(hunt.closes_at)} IST
              </span>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] bg-[#9B6CFF] p-5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em]">
            FREE TO PLAY · GOOGLE OR EMAIL
          </p>
          <h2 className="font-heading text-2xl font-extrabold leading-tight">
            Find {totalCount || 10} hidden places across SDMCET &amp; win prizes!
          </h2>
          <p className="text-xs font-semibold">
            Sign in with Google or email to track your clues, collect QR
            stickers, and climb the live leaderboard.
          </p>
          <Link
            href="/login?next=/hunt"
            className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] shadow-[3px_3px_0_#12091E]"
          >
            <Sparkles className="size-4" />
            Join the Treasure Hunt →
          </Link>
        </section>
      )}

      {/* Clue List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Campus Clues ({foundCount}/{totalCount})
          </h2>
          <Link
            href="/scan"
            className="text-xs font-extrabold text-[#FFD60A] hover:underline"
          >
            Open scanner →
          </Link>
        </div>

        {clues.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-6 text-center text-sm text-[#9C97B0]">
            Clues will appear here as soon as the Treasure Hunt places are
            published.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {clues.map((item) => {
              const hintVisible = Boolean(revealedHints[item.point_id]);
              return (
                <article
                  key={item.point_id}
                  className={`rounded-[22px] border-[1.5px] p-4 space-y-2.5 transition-colors ${
                    item.found
                      ? 'border-[#FFD60A]/60 bg-[#1F1230]'
                      : item.locked
                        ? 'border-dashed border-[#3B2758] bg-[#1F1230]/40 opacity-75'
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
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9C97B0]">
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
                          {item.found_at && (
                            <p className="text-[11px] text-[#9C97B0]">
                              Collected at {formatTime(item.found_at)} IST
                            </p>
                          )}
                        </>
                      ) : item.locked ? (
                        <p className="text-xs text-[#9C97B0]">
                          Find the previous place to unlock this riddle.
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-bold leading-snug text-[#F4F2FA]">
                            &ldquo;{item.clue}&rdquo;
                          </p>
                          {item.hint && (
                            <div className="pt-1">
                              {hintVisible ? (
                                <p className="rounded-xl bg-[#12091E] px-3 py-2 text-xs font-semibold text-[#22D3EE]">
                                  Hint: {item.hint}
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRevealedHints((prev) => ({
                                      ...prev,
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

                  {!item.found && !item.locked && (
                    <Link
                      href="/scan"
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#FFD60A]/50 bg-[#12091E] text-xs font-extrabold text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#12091E] transition-colors"
                    >
                      <QrCode className="size-3.5" />
                      Found it? Scan QR sticker
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Top 5 Leaderboard Preview */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Trophy className="size-5 text-[#FFE14D]" />
            Top Hunters
          </h2>
          <Link
            href="/hunt/leaderboard"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FFD60A]"
          >
            Full leaderboard
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {leaderboard.length === 0 ? (
          <p className="py-3 text-center text-xs text-[#9C97B0]">
            No stamps yet. Scan a hidden QR sticker to be #1!
          </p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.slice(0, 5).map((row) => {
              const isMe = row.user_id === userId;
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
                    #{row.rank} · {row.display_name}
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

        {userId && (
          <label className="flex items-center justify-between border-t border-[#3B2758] pt-3 text-xs font-semibold text-[#BDB8CF] cursor-pointer">
            <span>Hide me from the public leaderboard</span>
            <input
              type="checkbox"
              checked={hidden}
              disabled={isPending}
              onChange={(e) => handleToggleHidden(e.target.checked)}
              className="size-4 accent-[#FFD60A]"
            />
          </label>
        )}
      </section>

      {/* Rules Card */}
      <section className="rounded-[20px] border border-[#3B2758] bg-[#1F1230]/60 p-4 text-xs text-[#9C97B0] space-y-1">
        <p className="font-extrabold uppercase tracking-wider text-[#F4F2FA]">
          Treasure Hunt Rules
        </p>
        <p>
          1. Scan stickers in any order — wait 45 seconds between scans. 2. One
          stamp per place per player. 3. Organisers review suspicious speeds and
          contact winners by email.
        </p>
      </section>
    </div>
  );
}
