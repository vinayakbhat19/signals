'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
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

// 10 Canonical Campus Hunt Clues (guaranteed to render for all players)
const DEFAULT_HUNT_CLUES: Omit<ClueItem, 'found' | 'found_at' | 'points' | 'locked'>[] = [
  {
    sort: 1,
    point_id: 'clue-1-library',
    place: 'Library steps',
    clue: 'Silence is loud here, and the stairs keep secrets.',
    hint: 'Books live inside.',
    found_text: 'Shhh! You found the quiet place.',
    mascot: 'doodle',
  },
  {
    sort: 2,
    point_id: 'clue-2-canteen',
    place: 'Canteen',
    clue: "Chai o'clock. Follow your nose and your hunger.",
    hint: 'It smells of hot samosas.',
    found_text: 'Chai and stamps. Perfect.',
    mascot: 'buzz',
  },
  {
    sort: 3,
    point_id: 'clue-3-maingate',
    place: 'Main gate',
    clue: 'Every story of the fest starts and ends here.',
    hint: 'You walked through it this morning.',
    found_text: 'The big entrance!',
    mascot: 'kick',
  },
  {
    sort: 4,
    point_id: 'clue-4-fountain',
    place: 'Fountain',
    clue: 'Water, but not a lake. Wishes welcome.',
    hint: 'Near the campus garden.',
    found_text: 'Splash! Wish granted.',
    mascot: 'zap',
  },
  {
    sort: 5,
    point_id: 'clue-5-noticeboard',
    place: 'Notice board',
    clue: 'Everything is announced here, even the things nobody reads.',
    hint: 'Pins, paper and dates.',
    found_text: 'You read the notices. Rare!',
    mascot: 'spark',
  },
  {
    sort: 6,
    point_id: 'clue-6-cyclestand',
    place: 'Cycle stand',
    clue: 'Two wheels sleep here all day.',
    hint: 'Rows of handlebars.',
    found_text: 'Nice parking skills.',
    mascot: 'kick',
  },
  {
    sort: 7,
    point_id: 'clue-7-stage',
    place: 'Open air stage',
    clue: 'Where the music comes out to play.',
    hint: 'Look for the big speakers.',
    found_text: 'Take a bow!',
    mascot: 'beat',
  },
  {
    sort: 8,
    point_id: 'clue-8-statue',
    place: 'Statue',
    clue: 'He stands all day and never gets a seat.',
    hint: 'People take selfies with him.',
    found_text: 'Stand tall. Stamp taken.',
    mascot: 'doodle',
  },
  {
    sort: 9,
    point_id: 'clue-9-bench',
    place: 'Garden bench',
    clue: 'Take a break, but not for too long.',
    hint: 'Green, leafy and quiet.',
    found_text: 'Good spot for a rest.',
    mascot: 'spark',
  },
  {
    sort: 10,
    point_id: 'clue-10-helpdesk',
    place: 'Help desk',
    clue: 'Lost? Confused? This place has answers (and the final stamp).',
    hint: 'Volunteers in bright shirts.',
    found_text: 'You finished the hunt! Head to the desk to claim your prize.',
    mascot: 'zap',
  },
];

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

  // Build sequential clues: Clue 1 unlocked by default; finding Clue 1 unlocks Clue 2; etc.
  const buildSequentialClues = useCallback((dbClues: ClueItem[] = []) => {
    // Check locally stored found stamps as fallback
    let localFoundIds: string[] = [];
    if (typeof window !== 'undefined' && user) {
      try {
        const stored = localStorage.getItem(`fiesta_found_stamps_${user.id}`);
        if (stored) localFoundIds = JSON.parse(stored);
      } catch {
        // ignore
      }
    }

    // Merge database clues with default 10 clues
    return DEFAULT_HUNT_CLUES.map((base, idx) => {
      const match = dbClues.find(
        (c) => c.sort === base.sort || c.point_id === base.point_id
      );

      const isFound =
        Boolean(match?.found) || localFoundIds.includes(base.point_id);

      return {
        sort: base.sort,
        point_id: match?.point_id || base.point_id,
        mascot: match?.mascot || base.mascot,
        found: isFound,
        found_at: match?.found_at || null,
        points: isFound ? (match?.points ?? 10) : null,
        place: base.place,
        clue: base.clue,
        hint: base.hint,
        found_text: base.found_text,
        locked: false, // Calculated next
      };
    }).map((item, idx, arr) => {
      // Sequential rule:
      // Item 0 (Clue 1) is never locked.
      // Item N (Clue N+1) is locked unless Item N-1 is already FOUND.
      const previousFound = idx === 0 ? true : arr[idx - 1].found;
      const isLocked = !item.found && !previousFound;

      return {
        ...item,
        locked: isLocked,
      };
    });
  }, [user]);

  const loadHunt = useCallback(async () => {
    if (!user) {
      setClues(buildSequentialClues([]));
      return;
    }

    const supabase = createClient();
    try {
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

      const dbClues = Array.isArray(clueRes.data)
        ? (clueRes.data as ClueItem[])
        : [];
      setClues(buildSequentialClues(dbClues));

      if (Array.isArray(lbRes.data)) {
        setLeaders(lbRes.data as LeaderRow[]);
      }
    } catch {
      setClues(buildSequentialClues([]));
    }
  }, [buildSequentialClues, user]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void loadHunt());
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadHunt();
    }, 30_000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [loadHunt]);

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
  const totalCount = clues.length || 10;
  const basePts = clues.reduce((acc, c) => acc + (c.points ?? 0), 0);
  const isComplete = totalCount > 0 && foundCount >= totalCount;
  const myScore = basePts + (isComplete ? completeBonus : 0);
  const myRankIdx = user ? leaders.findIndex((l) => l.user_id === user.id) : -1;
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;

  // Active target is the first non-found clue
  const activeClue = clues.find((c) => !c.found);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center text-sm text-[#BDB8CF]">
        Loading Treasure Hunt…
      </div>
    );
  }

  // Non-logged-in view
  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-4 pb-12">
        <section className="rounded-[26px] border-[1.5px] border-[#9B6CFF] bg-[#1F1230] p-6 text-center space-y-4 shadow-[5px_5px_0_#FFD60A]">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#9B6CFF]/20 text-[#FFD60A]">
            <Lock className="size-8" />
          </span>

          <div className="space-y-1.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF4FD8]">
              FIESTA&apos;26 CAMPUS TREASURE HUNT
            </p>
            <h1 className="font-display text-3xl leading-tight text-[#F4F2FA]">
              LOG IN TO UNLOCK CLUES
            </h1>
            <p className="text-sm text-[#BDB8CF] leading-relaxed">
              10 hidden spots are waiting for you across campus! Sign in to get
              immediate access to <strong>Clue #1</strong>. Once you solve Clue #1
              and scan its QR sticker, <strong>Clue #2</strong> automatically
              unlocks!
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center pt-2">
            <Link
              href="/login/?next=/hunt/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-6 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
            >
              <Sparkles className="size-4" />
              Log in to play
            </Link>
            <Link
              href="/signup/"
              className="inline-flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-[#3B2758] bg-[#12091E] px-6 text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A] transition-colors"
            >
              Create account
            </Link>
          </div>
        </section>

        {/* Preview of the 10 clue game */}
        <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            How the 10 Clues Work
          </h2>
          <div className="space-y-2 text-xs text-[#BDB8CF]">
            <p>
              📍 <strong>Sequential Hunt:</strong> All hunters begin with Clue #1.
              Each secret spot unlocks only after you find and scan the previous one.
            </p>
            <p>
              ⭐ <strong>Scoring:</strong> Earn +10 pts per stamp found, plus a +20 pts
              bonus when you collect all 10!
            </p>
            <p>
              🏆 <strong>Live Leaderboard:</strong> Compete in real time against other
              students for top prizes at the Valedictory ceremony.
            </p>
          </div>
          <Link
            href="/hunt/leaderboard/"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FFD60A] hover:underline pt-1"
          >
            View Live Leaderboard
            <ChevronRight className="size-4" />
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
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
            Read your clue, find the hidden spot, scan the QR sticker. +{stampValue}{' '}
            pts per place · +{completeBonus} bonus for all {totalCount}!
          </p>
        </div>
        <Link
          href="/scan/"
          aria-label="Scan sticker QR"
          className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-[#FFD60A] text-[#12091E] shadow-[4px_4px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
        >
          <QrCode className="size-6 stroke-[2.3]" />
        </Link>
      </header>

      {/* Hunter Passport Card */}
      <section className="rounded-[24px] bg-[#9B6CFF] p-5 text-[#12091E] shadow-[5px_5px_0_#FFD60A] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase">
              {profile?.full_name || 'YOUR HUNTER PASSPORT'}
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

        {/* Progress bar */}
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
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#12091E] px-4 text-xs font-extrabold text-[#FFD60A] shadow-[2px_2px_0_#FF4FD8]"
          >
            <QrCode className="size-4" />
            Scan sticker to collect
          </Link>
          <Link
            href="/hunt/leaderboard/"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#12091E] hover:underline"
          >
            <Trophy className="size-3.5" />
            Full Leaderboard
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* Completion Banner */}
      {isComplete && (
        <section className="rounded-[22px] border-[1.5px] border-[#FFD60A] bg-[#FFD60A]/15 p-4 text-center space-y-1.5 shadow-[4px_4px_0_#FFD60A]">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#FFD60A]">
            <Award className="size-4" />
            HUNT FULLY COMPLETED!
          </span>
          <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            You solved all 10 campus clues &amp; claimed the +{completeBonus} pts bonus!
          </p>
          <p className="text-xs text-[#CFCBDD]">
            Check your final position on the Leaderboard and visit the Prize Desk
            during the Valedictory ceremony.
          </p>
        </section>
      )}

      {/* The 10 Clues (Sequential) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            The 10 Hidden Clues ({foundCount}/{totalCount})
          </h2>
          <span className="text-xs text-[#9C97B0]">
            {isComplete
              ? 'All 10 unlocked!'
              : activeClue
                ? `Current: Clue #${activeClue.sort}`
                : 'Solve in order'}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {clues.map((item) => {
            const showHint = Boolean(hintsOpen[item.point_id]);
            const isCurrentActive = !item.found && !item.locked;

            return (
              <article
                key={item.point_id}
                className={`rounded-[22px] border-[1.5px] p-4 space-y-2.5 transition-all ${
                  item.found
                    ? 'border-[#FFD60A]/70 bg-[#1F1230] shadow-[0_0_12px_rgba(255,214,10,0.08)]'
                    : isCurrentActive
                      ? 'border-[#FF4FD8] bg-[#1F1230] shadow-[4px_4px_0_#FF4FD8]'
                      : 'border-[#3B2758] bg-[#12091E]/70 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-[14px] ${
                      item.found
                        ? 'bg-[#2A1840]'
                        : isCurrentActive
                          ? 'bg-[#FF4FD8]/20'
                          : 'bg-[#12091E] grayscale opacity-50'
                    }`}
                  >
                    <StampMascotSvg
                      mascot={(item.mascot as StampMascot) || 'spark'}
                      size={38}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase text-[#9C97B0]">
                        CLUE #{item.sort}
                      </span>
                      {item.found ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD60A] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                          <CheckCircle2 className="size-3" />
                          +{item.points ?? 10} FOUND
                        </span>
                      ) : isCurrentActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FF4FD8] px-2.5 py-0.5 text-[10px] font-extrabold text-[#12091E] animate-pulse">
                          🎯 YOUR NEXT TARGET
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2A1840] px-2 py-0.5 text-[10px] font-extrabold text-[#9C97B0]">
                          <Lock className="size-3" />
                          LOCKED
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
                      <div className="space-y-1 py-1">
                        <p className="text-xs font-bold text-[#F4F2FA]/70">
                          🔒 Hidden Clue
                        </p>
                        <p className="text-[11px] text-[#9C97B0]">
                          Solve Clue #{item.sort - 1} and scan its QR sticker to
                          unlock this riddle!
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold leading-snug text-[#F4F2FA]">
                          &ldquo;{item.clue}&rdquo;
                        </p>

                        {item.hint && (
                          <div className="pt-1">
                            {showHint ? (
                              <p className="rounded-xl bg-[#12091E] px-3 py-2 text-xs font-semibold text-[#22D3EE] border border-[#22D3EE]/30">
                                💡 Hint: {item.hint}
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

                        <div className="pt-1">
                          <Link
                            href="/scan/"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#FFD60A] px-3 text-[11px] font-extrabold text-[#12091E]"
                          >
                            <QrCode className="size-3.5" />
                            Scan spot QR
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Top Hunters Mini-Leaderboard */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Trophy className="size-5 text-[#FFE14D]" />
            Top Hunters
          </h2>
          <Link
            href="/hunt/leaderboard/"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FFD60A] hover:underline"
          >
            Full Leaderboard
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {leaders.length === 0 ? (
          <p className="py-3 text-center text-xs text-[#9C97B0]">
            No stamps yet. Scan Clue #1 to be #1!
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
