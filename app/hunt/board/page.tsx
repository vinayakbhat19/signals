'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LeaderRow {
  user_id: string;
  display_name: string;
  stamps: number;
  score: number;
}

export default function HuntTvBoardPage() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    const target = `${window.location.origin}/hunt/`;
    QRCode.toDataURL(target, { width: 180, margin: 1 })
      .then(setQrUrl)
      .catch(() => {});

    let active = true;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('stamp_leaderboard')
        .select('user_id, display_name, stamps, score')
        .order('score', { ascending: false })
        .order('last_scan', { ascending: true })
        .limit(15);
      if (active && data) setRows(data as LeaderRow[]);
    }
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-[#12091E] p-6 text-[#F4F2FA] space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#FF4FD8]">
            FIESTA&apos;26 · LIVE TREASURE HUNT
          </p>
          <h1 className="flex items-center gap-3 font-display text-4xl text-[#FFD60A] sm:text-5xl">
            <Trophy className="size-10" />
            TOP HUNTERS
          </h1>
        </div>
        {qrUrl && (
          <div className="rounded-2xl bg-white p-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Join Hunt QR" className="size-28" />
            <p className="mt-1 text-[10px] font-extrabold text-[#12091E]">
              SCAN TO PLAY
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, idx) => (
          <div
            key={r.user_id}
            className="flex items-center justify-between rounded-2xl border-2 border-[#3B2758] bg-[#1F1230] px-5 py-4"
          >
            <span className="truncate font-heading text-xl font-extrabold">
              #{idx + 1} {r.display_name}
            </span>
            <span className="shrink-0 font-display text-2xl text-[#FFD60A]">
              {r.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
