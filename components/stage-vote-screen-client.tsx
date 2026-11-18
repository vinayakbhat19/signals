'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { WifiOff } from 'lucide-react';
import type { PollWithEvent } from '@/lib/data/voting';
import type { LiveCodeResult, PollResultRow } from '@/lib/types';

interface ScreenPayload {
  poll: PollWithEvent;
  results: PollResultRow[];
  liveCode: LiveCodeResult | null;
  serverTime: string;
}

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<ScreenPayload>);

export function StageVoteScreenClient({
  eventId,
  qrDataUrl,
  initialData,
  offlineCodes,
}: {
  eventId: string;
  qrDataUrl: string;
  initialData: ScreenPayload;
  offlineCodes: Array<{ w: number; code: string }>;
}) {
  const { data, error } = useSWR<ScreenPayload>(
    `/api/screen/vote/${eventId}`,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 10_000,
      keepPreviousData: true,
    }
  );

  const [nowSec, setNowSec] = useState<number>(() =>
    Math.floor(new Date(initialData.serverTime).getTime() / 1000)
  );

  useEffect(() => {
    const t = window.setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => window.clearInterval(t);
  }, []);

  const payload = data ?? initialData;
  const currentWindow = Math.floor(nowSec / 30);
  const secondsLeft = 30 - (nowSec % 30);

  const preloadedCode =
    offlineCodes.find((entry) => entry.w === currentWindow)?.code ?? null;
  const displayCode = preloadedCode ?? payload.liveCode?.code ?? '------';
  const totalVotes = payload.results[0]?.total_votes ?? 0;

  return (
    <div className="min-h-dvh bg-[#12091E] p-8 text-[#F4F2FA] flex flex-col justify-between gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <span className="rounded-full bg-[#FF4FD8] px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#12091E]">
            FIESTA&apos;26 · LIVE AUDIENCE VOTE
          </span>
          <h1 className="mt-3 font-display text-5xl leading-none">
            {payload.poll.event?.title ?? payload.poll.title}
          </h1>
          <p className="mt-2 text-lg font-bold text-[#FFD60A]">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} cast
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#FFE14D] bg-[#1F1230] px-4 py-2.5 text-sm font-bold text-[#FFE14D]">
            <WifiOff className="size-4" /> Offline code mode active
          </div>
        )}
      </div>

      {/* Main Split: Live Bars + QR / Stage Code */}
      <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {payload.results.map((c, idx) => (
            <div
              key={c.contestant_id}
              className="rounded-2xl border-2 border-[#3B2758] bg-[#1F1230] p-4"
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-heading text-2xl font-extrabold">
                  {idx + 1}. {c.name}
                </span>
                <span className="font-heading text-2xl font-extrabold text-[#FFD60A]">
                  {c.visible ? `${c.percent ?? 0}% (${c.votes ?? 0})` : 'LIVE'}
                </span>
              </div>
              <div className="h-5 overflow-hidden rounded-full bg-[#12091E]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: c.visible ? `${c.percent ?? 0}%` : '8%',
                    backgroundColor: idx === 0 ? '#FFD60A' : '#FF4FD8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-[#FFD60A] bg-[#1F1230] p-6 text-center shadow-[6px_6px_0_#FF4FD8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Scan to vote"
            className="size-56 rounded-2xl bg-white p-3"
          />
          <div className="space-y-1">
            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#BDB8CF]">
              SCAN TO VOTE NOW
            </div>
            {payload.poll.require_code && (
              <>
                <div className="pt-2 text-xs font-extrabold uppercase tracking-wider text-[#FF4FD8]">
                  STAGE CODE · {secondsLeft}s
                </div>
                <div className="rounded-2xl bg-[#12091E] px-5 py-2.5 font-mono text-4xl font-extrabold tracking-[0.2em] text-[#FFD60A]">
                  {displayCode}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
