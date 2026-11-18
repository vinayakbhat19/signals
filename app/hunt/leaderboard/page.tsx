'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, QrCode, Trophy } from 'lucide-react';
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
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('stamp_leaderboard')
        .select('user_id, display_name, stamps, score, last_scan')
        .order('score', { ascending: false })
        .order('last_scan', { ascending: true })
        .limit(100);
      if (active && data) setRows(data as LeaderRow[]);
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center text-sm text-[#BDB8CF]">
        Loading leaderboard…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg pt-4">
        <section className="rounded-[26px] border-[1.5px] border-[#9B6CFF] bg-[#1F1230] p-6 text-center space-y-4 shadow-[5px_5px_0_#FFD60A]">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#9B6CFF]/20 text-[#FFD60A]">
            <Lock className="size-8" />
          </span>
          <h1 className="font-display text-2xl text-[#F4F2FA]">
            LEADERBOARD LOCKED
          </h1>
          <p className="text-sm text-[#BDB8CF]">
            Sign in to view the Fiesta&apos;26 Treasure Hunt rankings and your
            position.
          </p>
          <Link
            href="/login/?next=/hunt/leaderboard/"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FFD60A] px-6 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
          >
            Log in to view
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/hunt/"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl text-[#F4F2FA]">
              <Trophy className="size-6 text-[#FFE14D]" />
              LEADERBOARD
            </h1>
            <p className="text-xs text-[#9C97B0]">
              Refreshes every 30 s · ties broken by earliest finish
            </p>
          </div>
        </div>
        <Link
          href="/scan/"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
        >
          <QrCode className="size-4" />
          Scan
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-10 text-center text-sm text-[#9C97B0]">
          No stamps collected yet. Be #1!
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const isMe = r.user_id === user.id;
            return (
              <div
                key={r.user_id}
                className={`flex items-center justify-between rounded-[16px] border px-4 py-3 text-sm ${
                  isMe
                    ? 'border-[#FFD60A] bg-[#FFD60A]/15 text-[#FFD60A]'
                    : idx < 3
                      ? 'border-[#FF4FD8]/60 bg-[#1F1230] text-[#F4F2FA]'
                      : 'border-[#3B2758] bg-[#1F1230]/80 text-[#F4F2FA]'
                }`}
              >
                <span className="truncate font-extrabold">
                  #{idx + 1} · {r.display_name}
                  {isMe && ' (You)'}
                </span>
                <span className="shrink-0 font-extrabold">
                  {r.score} pts · {r.stamps} places
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
