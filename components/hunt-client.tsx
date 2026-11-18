'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, QrCode, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { toggleLeaderboardHiddenAction } from '@/app/hunt/actions';
import {
  STAMP_MASCOT_COLOR,
  StampHeaderMascot,
  StampMascotSvg,
} from '@/components/stamp-mascots';
import type {
  RankedLeaderboardEntry,
  StampPointWithEvent,
} from '@/lib/data/hunt';
import { formatTime, minutesUntil } from '@/lib/time';
import type { Stamp, StampHunt } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HuntClientProps {
  hunt: StampHunt | null;
  points: StampPointWithEvent[];
  livePointIds: string[];
  leaderboard: RankedLeaderboardEntry[];
  userId: string | null;
  myDisplayName: string | null;
  myStamps: Stamp[];
  initialHidden: boolean;
  serverTime: string;
}

function formatTimeRemaining(targetIso: string, nowIso: string): string {
  const mins = minutesUntil(targetIso, nowIso);
  if (mins <= 0) return 'CLOSING SOON';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} M LEFT`;
  return m > 0 ? `${h} H ${m} M LEFT` : `${h} H LEFT`;
}

export function HuntClient({
  hunt,
  points,
  livePointIds,
  leaderboard,
  userId,
  myDisplayName,
  myStamps,
  initialHidden,
  serverTime,
}: HuntClientProps) {
  const [hidden, setHidden] = useState(initialHidden);
  const [isPending, startTransition] = useTransition();

  const liveSet = new Set(livePointIds);
  const stampByPoint = new Map(myStamps.map((s) => [s.point_id, s]));

  const totalPoints = points.length;
  const collectedCount = points.filter((p) => stampByPoint.has(p.id)).length;
  const rawScore = myStamps.reduce((sum, s) => sum + s.points, 0);
  const completeBonus =
    hunt && totalPoints > 0 && collectedCount >= totalPoints
      ? hunt.complete_bonus
      : 0;
  const myScore = rawScore + completeBonus;

  const myRankRow = userId
    ? leaderboard.find((entry) => entry.user_id === userId) ?? null
    : null;

  const topFive = leaderboard.slice(0, 5);
  const showMyRowSeparately =
    Boolean(userId) &&
    myRankRow !== null &&
    !topFive.some((r) => r.user_id === userId);

  const liveUncollected = points.find(
    (p) => liveSet.has(p.id) && !stampByPoint.has(p.id)
  );
  const anyLivePoint =
    liveUncollected ?? points.find((p) => liveSet.has(p.id)) ?? null;

  const nowMs = new Date(serverTime).getTime();
  const isHuntOpen =
    hunt !== null &&
    nowMs >= new Date(hunt.opens_at).getTime() &&
    nowMs <= new Date(hunt.closes_at).getTime();
  const isBeforeOpen = hunt !== null && nowMs < new Date(hunt.opens_at).getTime();

  const eyebrow = !hunt
    ? 'FEST STAMP HUNT'
    : isBeforeOpen
      ? `OPENS ${formatTime(hunt.opens_at).toUpperCase()}`
      : isHuntOpen
        ? `CLOSES ${formatTime(hunt.closes_at).toUpperCase()} · ${formatTimeRemaining(hunt.closes_at, serverTime)}`
        : `HUNT CLOSED AT ${formatTime(hunt.closes_at).toUpperCase()}`;

  function handleToggleHidden(next: boolean) {
    setHidden(next);
    startTransition(async () => {
      const res = await toggleLeaderboardHiddenAction(next);
      if (!res.ok) {
        setHidden(!next);
        toast.error(res.error);
      } else {
        toast.success(
          next
            ? 'You are now hidden from the public leaderboard'
            : 'You are visible on the public leaderboard'
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-4">
      {/* Header matching 22-hunt.png */}
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="space-y-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#A78BFA]">
            {eyebrow}
          </span>
          <h1 className="font-heading text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#F4F2FA]">
            {hunt?.name ?? 'Stamp Hunt'}
          </h1>
        </div>
        <StampHeaderMascot size={64} />
      </header>

      {/* Signed-in Stats Card OR Signed-out Join CTA */}
      {userId ? (
        <section
          aria-label="My hunt progress"
          className="grid grid-cols-3 gap-2 rounded-[24px] bg-[#C6FF3D] px-[18px] py-4 text-[#0B0A12] shadow-[5px_5px_0_#FF4FA3]"
        >
          <div className="flex flex-col">
            <span className="font-heading text-[34px] font-extrabold leading-none">
              {myScore}
            </span>
            <span className="mt-1 text-xs font-extrabold">POINTS</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-[34px] font-extrabold leading-none">
              {myRankRow ? `#${myRankRow.rank}` : '—'}
            </span>
            <span className="mt-1 text-xs font-extrabold">
              {hidden ? 'HIDDEN' : 'RANK'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-[34px] font-extrabold leading-none">
              {collectedCount}/{totalPoints}
            </span>
            <span className="mt-1 text-xs font-extrabold">STAMPS</span>
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] bg-[#C6FF3D] p-5 text-[#0B0A12] shadow-[5px_5px_0_#FF4FA3] space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em]">
              FREE TO PLAY · WIN FEST PRIZES
            </span>
            <h2 className="font-heading text-2xl font-extrabold leading-tight">
              Collect stamps across campus & climb the leaderboard
            </h2>
            <p className="text-sm font-semibold text-[#0B0A12]/80">
              Sign in to start collecting stamps at competitions. +{hunt?.stamp_value ?? 10} per stamp, +{hunt?.complete_bonus ?? 20} for completing your passport.
            </p>
          </div>
          <Link
            href="/login?next=/hunt"
            className="inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-[#0B0A12] px-5 text-sm font-extrabold text-[#C6FF3D]"
          >
            Join the hunt →
          </Link>
        </section>
      )}

      {/* Primary Action Strip: Scan to collect + LIVE NOW stamp card */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Link
          href="/scan"
          className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-[18px] bg-[#FF4FA3] px-4 py-3 text-base font-extrabold text-[#0B0A12] shadow-[4px_4px_0_#A78BFA] active:translate-y-0.5 transition-transform"
        >
          <QrCode className="size-5 stroke-[2.5]" aria-hidden="true" />
          Scan to collect
        </Link>

        {anyLivePoint && (
          <Link
            href={
              anyLivePoint.event_id
                ? `/events/${anyLivePoint.event_id}`
                : '/scan'
            }
            className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-[#FF4FA3] bg-[#16141F] px-3.5 py-2.5 text-[#F4F2FA] hover:bg-[#1E1B2B]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FF4FA3]/20 text-[#FF4FA3]">
              <Radio className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#FF4FA3]">
                LIVE NOW · STAMP OPEN
              </span>
              <span className="block truncate text-sm font-extrabold">
                {anyLivePoint.name}
                {anyLivePoint.venue_name ? ` · ${anyLivePoint.venue_name}` : ''}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Passport Grid */}
      <section aria-labelledby="heading-passport" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2
            id="heading-passport"
            className="font-heading text-[22px] font-extrabold text-[#F4F2FA]"
          >
            {userId ? 'My passport' : 'Fest passport'}
          </h2>
          {totalPoints > 0 && (
            <span className="text-xs font-semibold text-[#9C97B0]">
              +{hunt?.complete_bonus ?? 20} for all {totalPoints}
            </span>
          )}
        </div>

        {points.length > 0 ? (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {points.map((point) => {
              const collected = stampByPoint.get(point.id);
              const isLive = liveSet.has(point.id);
              const color = STAMP_MASCOT_COLOR[point.mascot];
              const tileHref = point.event_id
                ? `/events/${point.event_id}`
                : '/scan';

              if (collected) {
                return (
                  <li key={point.id}>
                    <Link
                      href={tileHref}
                      title={`${point.name} — collected at ${formatTime(collected.scanned_at)} (+${collected.points} pts)`}
                      className="flex h-full flex-col items-center justify-between gap-1 rounded-[14px] border-[1.5px] bg-[#16141F] px-1.5 py-2 text-center"
                      style={{ borderColor: color }}
                    >
                      <StampMascotSvg mascot={point.mascot} size={40} />
                      <span className="line-clamp-2 text-[10px] font-bold leading-tight text-[#F4F2FA]">
                        {point.name}
                      </span>
                      <span className="text-[9px] font-bold text-[#9C97B0]">
                        {formatTime(collected.scanned_at)}
                      </span>
                    </Link>
                  </li>
                );
              }

              if (isLive) {
                return (
                  <li key={point.id}>
                    <Link
                      href={tileHref}
                      title={`${point.name} — LIVE right now!`}
                      className="flex h-full flex-col items-center justify-between gap-1 rounded-[14px] border-2 border-[#FF4FA3] bg-[#FF4FA3]/10 px-1.5 py-2 text-center text-[#FF7DBB]"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-[#FF4FA3] text-[10px] font-extrabold text-[#FF4FA3]">
                        LIVE
                      </span>
                      <span className="line-clamp-2 text-[10px] font-extrabold leading-tight text-[#F4F2FA]">
                        {point.name}
                      </span>
                      <span className="text-[9px] font-bold text-[#FF7DBB]">
                        Scan now
                      </span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={point.id}>
                  <Link
                    href={tileHref}
                    title={
                      point.event
                        ? `${point.name} — ${formatTime(point.event.starts_at)}`
                        : point.name
                    }
                    className="flex h-full flex-col items-center justify-between gap-1 rounded-[14px] border-[1.5px] border-dashed border-[#3A3549] px-1.5 py-2 text-center text-[#8A8599] hover:border-[#9C97B0]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-[#3A3549] font-heading text-base font-extrabold">
                      ?
                    </span>
                    <span className="line-clamp-2 text-[10px] font-bold leading-tight">
                      {point.name}
                    </span>
                    {point.event && (
                      <span className="text-[9px] text-[#8A8599]">
                        {formatTime(point.event.starts_at)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#2E2A3D] bg-[#16141F]/60 p-6 text-center text-sm text-[#9C97B0]">
            No stamp stations are active yet. Run{' '}
            <code className="text-[#C6FF3D]">supabase/seed_hunt.sql</code> in
            Supabase SQL Editor to populate test stations.
          </div>
        )}
      </section>

      {/* Leaderboard Preview */}
      <section aria-labelledby="heading-leaderboard" className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2
            id="heading-leaderboard"
            className="font-heading text-[22px] font-extrabold text-[#F4F2FA]"
          >
            Leaderboard
          </h2>
          <Link
            href="/hunt/leaderboard"
            className="py-1.5 text-sm font-bold text-[#C6FF3D] hover:text-[#E3FF9A]"
          >
            Full leaderboard
          </Link>
        </div>

        {topFive.length > 0 ? (
          <ol className="overflow-hidden rounded-[20px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] text-sm">
            {topFive.map((row, idx) => {
              const isMe = row.user_id === userId;
              const badgeBg =
                row.rank === 1
                  ? 'bg-[#FFE14D] text-[#0B0A12]'
                  : row.rank === 2
                    ? 'bg-[#DCD8E6] text-[#0B0A12]'
                    : row.rank === 3
                      ? 'bg-[#FF9F43] text-[#0B0A12]'
                      : 'bg-[#24212F] text-[#CFCBDD]';

              return (
                <li
                  key={row.user_id}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-3',
                    idx > 0 && 'border-t border-[#2E2A3D]',
                    isMe && 'bg-[#C6FF3D]/10'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-[9px] text-xs font-extrabold',
                      badgeBg
                    )}
                  >
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold text-[#F4F2FA]">
                    {isMe ? `You · ${row.display_name}` : row.display_name}
                    {row.verified && (
                      <Check
                        className="ml-1 inline size-3.5 text-[#C6FF3D]"
                        aria-label="Verified student"
                      />
                    )}
                  </span>
                  <span className="text-xs text-[#9C97B0]">
                    {row.stamps} {row.stamps === 1 ? 'stamp' : 'stamps'}
                  </span>
                  <span
                    className={cn(
                      'w-11 text-right font-extrabold',
                      row.rank === 1 || isMe
                        ? 'text-[#C6FF3D]'
                        : 'text-[#F4F2FA]'
                    )}
                  >
                    {row.score}
                  </span>
                </li>
              );
            })}

            {showMyRowSeparately && myRankRow && (
              <li className="flex items-center gap-3 border-t border-dashed border-[#3A3549] bg-[#C6FF3D]/10 px-3.5 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-[#C6FF3D] text-xs font-extrabold text-[#C6FF3D]">
                  {myRankRow.rank}
                </span>
                <span className="min-w-0 flex-1 truncate font-extrabold text-[#F4F2FA]">
                  You · {myDisplayName || myRankRow.display_name}
                </span>
                <span className="text-xs text-[#9C97B0]">
                  {myRankRow.stamps} stamps
                </span>
                <span className="w-11 text-right font-extrabold text-[#C6FF3D]">
                  {myRankRow.score}
                </span>
              </li>
            )}
          </ol>
        ) : (
          <div className="rounded-[20px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-5 py-7 text-center space-y-3">
            <p className="text-sm font-semibold text-[#CFCBDD]">
              No stamps yet. Scan at a competition to be #1.
            </p>
            <Link
              href="/scan"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#C6FF3D] px-4 text-xs font-extrabold text-[#0B0A12]"
            >
              <QrCode className="size-4" aria-hidden="true" />
              Scan a Stamp Station
            </Link>
          </div>
        )}

        {/* Rules line */}
        <p className="text-xs leading-relaxed text-[#9C97B0]">
          +{hunt?.stamp_value ?? 10} per live stamp · +{hunt?.bonus_value ?? 5}{' '}
          during finals/results · +{hunt?.complete_bonus ?? 20} for all{' '}
          {totalPoints || 'stamps'}. Top 3 win prizes; everyone with all stamps
          enters the lucky draw. Verified @sdmcet.ac.in account & college ID
          needed at the help desk.
        </p>

        {/* Hide me switch (signed in only) */}
        {userId && (
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-[16px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-4 py-2 text-sm font-semibold text-[#F4F2FA] cursor-pointer">
            <span>Hide me from the leaderboard</span>
            <input
              type="checkbox"
              checked={hidden}
              disabled={isPending}
              onChange={(e) => handleToggleHidden(e.target.checked)}
              className="size-5 accent-[#C6FF3D] cursor-pointer"
            />
          </label>
        )}
      </section>
    </div>
  );
}
