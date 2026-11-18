'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Loader2, QrCode } from 'lucide-react';
import { StampMascotSvg } from '@/components/stamp-mascots';
import { createClient } from '@/lib/supabase/client';
import type { StampMascot } from '@/lib/types';

interface ClaimResponse {
  ok: boolean;
  reason?: string;
  message?: string;
  points?: number;
  mascot?: string;
  place?: string;
  found_text?: string;
  stamps?: number;
  total?: number;
  of?: number;
  wait?: number;
}

export function TreasureClaimClient({
  pointId,
  code,
}: {
  pointId: string;
  code: string;
}) {
  const calledRef = useRef(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function claim() {
      try {
        const supabase = createClient();
        const { data, error: rpcErr } = await (
          supabase as unknown as {
            rpc: (
              fn: string,
              args: { p_point: string; p_code: string }
            ) => Promise<{
              data: ClaimResponse | null;
              error: { code?: string; message?: string } | null;
            }>;
          }
        ).rpc('claim_stamp', { p_point: pointId, p_code: code });

        if (rpcErr) {
          setError(rpcErr.message || 'Could not claim stamp right now.');
          return;
        }
        setResult(data);
      } catch {
        setError('Network error while claiming stamp. Try scanning again.');
      }
    }

    void claim();
  }, [pointId, code]);

  if (!result && !error) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="size-10 animate-spin text-[#FFD60A]" />
        <p className="font-heading text-xl font-extrabold text-[#F4F2FA]">
          Checking your QR sticker…
        </p>
      </div>
    );
  }

  if (error || !result?.ok) {
    const isTooFast = result?.reason === 'too_fast';
    const isAlready = result?.reason === 'already';

    return (
      <div className="mx-auto flex min-h-[65dvh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
        <span
          className={`flex size-16 items-center justify-center rounded-[20px] ${
            isAlready
              ? 'bg-[#FFD60A] text-[#12091E]'
              : isTooFast
                ? 'bg-[#22D3EE] text-[#12091E]'
                : 'bg-[#FF4F5E]/20 text-[#FF4F5E]'
          }`}
        >
          {isAlready ? (
            <CheckCircle2 className="size-8" />
          ) : isTooFast ? (
            <Clock className="size-8" />
          ) : (
            <AlertTriangle className="size-8" />
          )}
        </span>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl text-[#F4F2FA]">
            {isAlready
              ? 'ALREADY COLLECTED!'
              : isTooFast
                ? 'HOLD ON A SECOND!'
                : 'COULD NOT CLAIM'}
          </h1>
          {result?.place && (
            <p className="font-heading text-lg font-extrabold text-[#FFD60A]">
              {result.place}
            </p>
          )}
          <p className="text-sm text-[#CFCBDD]">
            {error || result?.message || 'Try scanning this QR sticker again.'}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Link
            href="/hunt"
            className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
          >
            Back to clues &amp; passport
          </Link>
          <Link
            href="/scan"
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-xs font-bold text-[#F4F2FA]"
          >
            <QrCode className="size-4" />
            Scan another sticker
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-28 items-center justify-center rounded-[28px] bg-[#2A1840] shadow-[6px_6px_0_#FFD60A]">
        <StampMascotSvg
          mascot={(result.mascot as StampMascot) || 'spark'}
          size={84}
        />
      </div>

      <span className="rounded-full bg-[#FFD60A] px-4 py-1 font-display text-lg text-[#12091E] shadow-[3px_3px_0_#FF4FD8]">
        +{result.points ?? 10} POINTS!
      </span>

      <div className="space-y-1.5">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#9B6CFF]">
          PLACE UNLOCKED
        </p>
        <h1 className="font-heading text-3xl font-extrabold text-[#F4F2FA]">
          {result.place || 'Hidden Spot Found!'}
        </h1>
        {result.found_text && (
          <p className="text-sm font-semibold text-[#CFCBDD]">
            {result.found_text}
          </p>
        )}
      </div>

      <div className="grid w-full grid-cols-2 gap-3 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">
            PLACES FOUND
          </p>
          <p className="font-heading text-2xl font-extrabold text-[#FFD60A]">
            {result.stamps ?? 1} / {result.of ?? 10}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">
            TOTAL POINTS
          </p>
          <p className="font-heading text-2xl font-extrabold text-[#FF4FD8]">
            {result.total ?? 10}
          </p>
        </div>
      </div>

      <Link
        href="/hunt"
        className="flex h-12 w-full items-center justify-center rounded-[18px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
      >
        See your next clue →
      </Link>
    </div>
  );
}
