'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, QrCode, Trophy } from 'lucide-react';
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
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);

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
  }, []);

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
            const isMe = r.user_id === user?.id;
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
