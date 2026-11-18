'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, Loader2, QrCode } from 'lucide-react';
import {
  claimStampAction,
  type ClaimActionResponse,
} from '@/app/hunt/actions';
import { StampMascotSvg } from '@/components/stamp-mascots';

const CONFETTI_PIECES = [
  { left: '8%', w: 10, h: 16, bg: '#C6FF3D', round: '2px', delay: '0s' },
  { left: '22%', w: 12, h: 12, bg: '#FF4FA3', round: '6px', delay: '0.6s' },
  { left: '38%', w: 8, h: 18, bg: '#22D3EE', round: '2px', delay: '1.4s' },
  { left: '55%', w: 12, h: 12, bg: '#FFE14D', round: '2px', delay: '0.3s' },
  { left: '72%', w: 10, h: 16, bg: '#A78BFA', round: '2px', delay: '1s' },
  { left: '86%', w: 12, h: 12, bg: '#FF9F43', round: '6px', delay: '1.8s' },
  { left: '16%', w: 8, h: 14, bg: '#22D3EE', round: '2px', delay: '2.2s' },
  { left: '78%', w: 8, h: 14, bg: '#C6FF3D', round: '2px', delay: '2.6s' },
];

export function StampClaimClient({
  pointId,
  code,
}: {
  pointId: string;
  code: string;
}) {
  const claimedRef = useRef(false);
  const [result, setResult] = useState<ClaimActionResponse | null>(null);

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (claimedRef.current) return;
    claimedRef.current = true;

    void claimStampAction(pointId, code).then((res) => {
      setResult(res);
    });
  }, [pointId, code]);

  if (!result) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0B0A12] px-6 text-center text-[#F4F2FA]">
        <Loader2
          className="size-10 animate-spin text-[#C6FF3D]"
          aria-hidden="true"
        />
        <p className="font-heading text-xl font-extrabold">
          Collecting your stamp…
        </p>
      </div>
    );
  }

  const { claim, pointName, newRank, nextLive } = result;

  if (claim.ok) {
    const progressPct =
      claim.of > 0 ? Math.min(100, Math.round((claim.stamps / claim.of) * 100)) : 0;
    const bonusBadge =
      claim.method === 'printed'
        ? `+${claim.points} PRINTED BACKUP STAMP`
        : claim.points > 10
          ? `+10 STAMP · +${claim.points - 10} FINAL BONUS`
          : `+${claim.points} LIVE STAMP`;

    return (
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between overflow-hidden bg-[#0B0A12] px-6 pt-14 pb-8 text-[#F4F2FA]">
        {/* Neon Confetti */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {CONFETTI_PIECES.map((c, idx) => (
            <span
              key={idx}
              className="confetti absolute top-0"
              style={{
                left: c.left,
                width: c.w,
                height: c.h,
                backgroundColor: c.bg,
                borderRadius: c.round,
                animationDelay: c.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex w-full flex-col items-center">
          <span
            className="popin font-heading text-[88px] font-extrabold leading-none tracking-[-0.04em] text-[#C6FF3D]"
            style={{ textShadow: '6px 6px 0 #FF4FA3' }}
          >
            +{claim.points}!
          </span>

          <span className="mt-3 rounded-full bg-[#FFE14D] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[#0B0A12]">
            {bonusBadge}
          </span>

          <div className="relative mt-6 flex h-[180px] w-[190px] items-end justify-center">
            <div className="absolute bottom-0 h-4 w-36 rounded-full bg-[#16141F]" />
            <StampMascotSvg
              mascot={claim.mascot}
              size={160}
              celebrating
              className="relative"
            />
          </div>

          <h1 className="mt-5 text-center font-heading text-[30px] font-extrabold leading-[1.08] tracking-[-0.02em]">
            {pointName}
            <br />
            stamp collected
          </h1>

          {/* Progress card matching 21-stamp-collected.png */}
          <section className="mt-5 w-full space-y-3 rounded-[22px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>
                {claim.stamps} of {claim.of} stamps
              </span>
              <span className="text-[#C6FF3D]">{claim.total} points</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-[#2E2A3D]">
              <div
                className="h-full rounded-full bg-[#C6FF3D] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {newRank && (
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold">
                  You&apos;re now{' '}
                  <span className="text-[#C6FF3D]">#{newRank}</span>
                </span>
                <span className="rounded-full bg-[#C6FF3D] px-2.5 py-1 text-[11px] font-extrabold text-[#0B0A12]">
                  STAMP SAVED
                </span>
              </div>
            )}

            {nextLive && (
              <p className="text-xs text-[#BDB8CF]">
                Next stamp nearby:{' '}
                <strong className="text-[#F4F2FA]">{nextLive.name}</strong>
                {nextLive.venue ? `, ${nextLive.venue}` : ''}, live now
              </p>
            )}
          </section>
        </div>

        <div className="relative z-10 mt-6 flex w-full flex-col gap-2.5">
          <Link
            href="/hunt"
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#C6FF3D] text-base font-extrabold text-[#0B0A12] shadow-[5px_5px_0_#FF4FA3]"
          >
            See my passport
          </Link>
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-[18px] border-2 border-[#2E2A3D] text-sm font-bold text-[#F4F2FA]"
          >
            What&apos;s on now
          </Link>
        </div>
      </div>
    );
  }

  // Friendly error / already-claimed states
  const isAlready = claim.reason === 'already';
  const isExpired = claim.reason === 'expired';
  const isNotLive = claim.reason === 'not_live' || claim.reason === 'closed';

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 bg-[#0B0A12] px-6 text-center text-[#F4F2FA]">
      <span
        className={
          isAlready
            ? 'flex size-16 items-center justify-center rounded-[20px] bg-[#C6FF3D] text-[#0B0A12]'
            : isNotLive
              ? 'flex size-16 items-center justify-center rounded-[20px] bg-[#FFE14D] text-[#0B0A12]'
              : 'flex size-16 items-center justify-center rounded-[20px] bg-[#FF4F5E] text-[#0B0A12]'
        }
      >
        {isAlready ? (
          <CheckCircle2 className="size-8 stroke-[2.4]" />
        ) : isNotLive ? (
          <Clock className="size-8 stroke-[2.4]" />
        ) : (
          <AlertCircle className="size-8 stroke-[2.4]" />
        )}
      </span>

      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#9C97B0]">
          {pointName}
        </span>
        <h1 className="font-heading text-3xl font-extrabold leading-tight">
          {isAlready
            ? 'Already in your passport'
            : isExpired
              ? 'Code expired'
              : isNotLive
                ? 'Not open right now'
                : 'Could not claim stamp'}
        </h1>
        <p className="text-sm text-[#CFCBDD]">{claim.message}</p>
      </div>

      <div className="flex w-full flex-col gap-2.5 pt-2">
        {isExpired && (
          <Link
            href="/scan"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#C6FF3D] text-base font-extrabold text-[#0B0A12] shadow-[5px_5px_0_#FF4FA3]"
          >
            <QrCode className="size-5" aria-hidden="true" />
            Scan screen again
          </Link>
        )}
        <Link
          href="/hunt"
          className={
            isExpired
              ? 'flex h-12 w-full items-center justify-center rounded-[18px] border-2 border-[#2E2A3D] text-sm font-bold text-[#F4F2FA]'
              : 'flex h-14 w-full items-center justify-center rounded-[18px] bg-[#C6FF3D] text-base font-extrabold text-[#0B0A12] shadow-[5px_5px_0_#FF4FA3]'
          }
        >
          See my passport
        </Link>
        <Link
          href="/"
          className="py-2 text-sm font-semibold text-[#9C97B0] hover:text-[#F4F2FA]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
