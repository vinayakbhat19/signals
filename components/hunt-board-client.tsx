'use client';

import useSWR from 'swr';
import { Check, Crown } from 'lucide-react';
import type { RankedLeaderboardEntry } from '@/lib/data/hunt';
import type { StampHunt } from '@/lib/types';

interface BoardPayload {
  hunt: StampHunt | null;
  leaderboard: RankedLeaderboardEntry[];
  totalPoints: number;
  serverTime: string;
}

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<BoardPayload>);

export function HuntBoardClient({
  initialData,
  qrDataUrl,
  festName,
}: {
  initialData: BoardPayload;
  qrDataUrl: string;
  festName: string;
}) {
  const { data } = useSWR<BoardPayload>('/api/hunt/leaderboard', fetcher, {
    fallbackData: initialData,
    refreshInterval: 15_000,
    keepPreviousData: true,
  });

  const payload = data ?? initialData;
  const rows = payload.leaderboard.slice(0, 15);

  return (
    <div className="min-h-dvh bg-[#12091E] p-8 text-[#F4F2FA] flex flex-col justify-between gap-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#FFD60A]">
            {festName} · LIVE LEADERBOARD
          </span>
          <h1 className="mt-1 font-heading text-5xl font-extrabold tracking-[-0.03em]">
            {payload.hunt?.name ?? 'Fest Stamp Hunt'}
          </h1>
        </div>

        {/* QR to /hunt in top-right corner */}
        <div className="flex items-center gap-3 rounded-2xl border-2 border-[#FFD60A] bg-[#1F1230] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Scan to join the Stamp Hunt"
            className="size-24 rounded-xl bg-white p-1"
          />
          <div className="max-w-[140px]">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#FFD60A]">
              JOIN NOW
            </div>
            <div className="mt-0.5 text-sm font-bold leading-snug">
              Scan to open your passport
            </div>
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.user_id}
              className={
                row.rank === 1
                  ? 'flex items-center gap-4 rounded-2xl bg-[#FFD60A] px-5 py-4 text-[#12091E] shadow-[5px_5px_0_#FF4FD8]'
                  : 'flex items-center gap-4 rounded-2xl border-2 border-[#3B2758] bg-[#1F1230] px-5 py-4'
              }
            >
              <span
                className={
                  row.rank === 1
                    ? 'flex size-11 items-center justify-center rounded-xl bg-[#12091E] font-heading text-2xl font-extrabold text-[#FFD60A]'
                    : row.rank === 2
                      ? 'flex size-11 items-center justify-center rounded-xl bg-[#DCD8E6] font-heading text-2xl font-extrabold text-[#12091E]'
                      : row.rank === 3
                        ? 'flex size-11 items-center justify-center rounded-xl bg-[#FF9F43] font-heading text-2xl font-extrabold text-[#12091E]'
                        : 'flex size-11 items-center justify-center rounded-xl bg-[#2A1840] font-heading text-xl font-extrabold text-[#CFCBDD]'
                }
              >
                {row.rank === 1 ? <Crown className="size-6" /> : row.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xl font-extrabold">
                  {row.display_name}
                  {row.verified && (
                    <Check className="ml-1.5 inline size-4" aria-label="Verified" />
                  )}
                </div>
                <div
                  className={
                    row.rank === 1
                      ? 'text-sm font-bold text-[#12091E]/80'
                      : 'text-sm text-[#9C97B0]'
                  }
                >
                  {row.stamps} / {payload.totalPoints || '—'} stamps
                </div>
              </div>
              <div
                className={
                  row.rank === 1
                    ? 'font-heading text-3xl font-extrabold'
                    : 'font-heading text-3xl font-extrabold text-[#FFD60A]'
                }
              >
                {row.score}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-[#3B2758] p-16 text-center font-heading text-3xl font-extrabold text-[#9C97B0]">
          No stamps yet — scan at any competition to be #1!
        </div>
      )}

      <div className="text-center text-sm font-semibold text-[#9C97B0]">
        Auto-updates every 15 seconds · Top 3 win prizes · All stamps enter the
        lucky draw
      </div>
    </div>
  );
}
