import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, QrCode } from 'lucide-react';
import { StampMascotSvg } from '@/components/stamp-mascots';
import { getProfile } from '@/lib/auth';
import { getHunt, getLeaderboard, listStampPoints } from '@/lib/data/hunt';
import { readWithFallback } from '@/lib/resilience';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Leaderboard · Stamp Hunt',
  description: 'Live Fiest 2026 Stamp Hunt rankings and podium.',
};

export default async function LeaderboardPage() {
  const [huntRes, leaderboardRes, pointsRes, profile] = await Promise.all([
    readWithFallback('hunt:config', () => getHunt(), null, 3000),
    readWithFallback('hunt:leaderboard:full', () => getLeaderboard(100), [], 3000),
    readWithFallback('hunt:points', () => listStampPoints(), [], 3000),
    getProfile(),
  ]);

  const hunt = huntRes.data;
  const rows = leaderboardRes.data;
  const totalStamps = pointsRes.data.length;
  const userId = profile?.id ?? null;

  const first = rows[0] ?? null;
  const second = rows[1] ?? null;
  const third = rows[2] ?? null;
  const rest = rows.slice(3);

  const myIndex = userId ? rows.findIndex((r) => r.user_id === userId) : -1;
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const personAbove = myIndex > 0 ? rows[myIndex - 1] : null;
  const pointsToPass =
    myRow && personAbove ? Math.max(1, personAbove.score - myRow.score + 1) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      {/* Header matching 23-leaderboard.png */}
      <header className="flex items-center gap-3 pt-1">
        <Link
          href="/hunt"
          aria-label="Back to Stamp Hunt"
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-[#F4F2FA] hover:border-[#FFD60A]"
        >
          <ArrowLeft className="size-5 stroke-[2.4]" aria-hidden="true" />
        </Link>
        <div>
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9B6CFF]">
            STAMP HUNT
            {hunt ? ` · CLOSES ${formatTime(hunt.closes_at).toUpperCase()}` : ''}
          </span>
          <h1 className="font-display text-[28px] leading-none tracking-[-0.01em] text-[#F4F2FA] sm:text-[34px]">
            LEADERBOARD
          </h1>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-6 py-12 text-center">
          <StampMascotSvg mascot="spark" size={64} />
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
              No stamps yet
            </h2>
            <p className="text-sm text-[#9C97B0]">
              Scan at a competition to be #1 on the podium.
            </p>
          </div>
          <Link
            href="/scan"
            className="inline-flex min-h-12 items-center gap-2 rounded-[16px] bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
          >
            <QrCode className="size-4" aria-hidden="true" />
            Scan to collect
          </Link>
        </div>
      ) : (
        <>
          {/* Top 3 Podium matching 23-leaderboard.png */}
          <section
            aria-label="Top 3 Podium"
            className="grid grid-cols-3 items-end gap-2.5 pt-3"
          >
            {/* #2 Silver */}
            <div className="flex flex-col items-center gap-1.5">
              {second ? (
                <>
                  <StampMascotSvg mascot="zap" size={44} />
                  <div className="text-center">
                    <div className="max-w-[100px] truncate text-xs font-extrabold text-[#F4F2FA]">
                      {second.display_name}
                    </div>
                    <div className="text-[11px] font-semibold text-[#9C97B0]">
                      {second.score} pts
                    </div>
                  </div>
                  <div className="flex h-[88px] w-full flex-col items-center justify-start rounded-t-[18px] bg-[#DCD8E6] pt-3 text-[#12091E]">
                    <span className="font-heading text-3xl font-extrabold">2</span>
                  </div>
                </>
              ) : (
                <div className="flex h-[70px] w-full items-center justify-center rounded-t-[18px] border border-dashed border-[#3B2758] text-xs text-[#8A8599]">
                  #2
                </div>
              )}
            </div>

            {/* #1 Lime with Crown */}
            <div className="flex flex-col items-center gap-1.5">
              {first && (
                <>
                  <Crown
                    className="size-6 fill-[#FFE14D] text-[#FFE14D]"
                    aria-hidden="true"
                  />
                  <StampMascotSvg mascot="spark" size={50} />
                  <div className="text-center">
                    <div className="max-w-[110px] truncate text-sm font-extrabold text-[#F4F2FA]">
                      {first.display_name}
                    </div>
                    <div className="text-xs font-bold text-[#FFD60A]">
                      {first.score} pts
                    </div>
                  </div>
                  <div className="flex h-[118px] w-full flex-col items-center justify-start rounded-t-[20px] bg-[#FFD60A] pt-3.5 text-[#12091E]">
                    <span className="font-heading text-4xl font-extrabold">1</span>
                  </div>
                </>
              )}
            </div>

            {/* #3 Orange */}
            <div className="flex flex-col items-center gap-1.5">
              {third ? (
                <>
                  <StampMascotSvg mascot="kick" size={42} />
                  <div className="text-center">
                    <div className="max-w-[100px] truncate text-xs font-extrabold text-[#F4F2FA]">
                      {third.display_name}
                    </div>
                    <div className="text-[11px] font-semibold text-[#9C97B0]">
                      {third.score} pts
                    </div>
                  </div>
                  <div className="flex h-[72px] w-full flex-col items-center justify-start rounded-t-[18px] bg-[#FF9F43] pt-2.5 text-[#12091E]">
                    <span className="font-heading text-3xl font-extrabold">3</span>
                  </div>
                </>
              ) : (
                <div className="flex h-[60px] w-full items-center justify-center rounded-t-[18px] border border-dashed border-[#3B2758] text-xs text-[#8A8599]">
                  #3
                </div>
              )}
            </div>
          </section>

          {/* Table from rank 4 onwards */}
          {rest.length > 0 && (
            <div className="overflow-hidden rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230]">
              <div className="grid grid-cols-[44px_1fr_72px_56px] border-b border-[#3B2758] px-3.5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9C97B0]">
                <span>#</span>
                <span>NAME</span>
                <span className="text-center">STAMPS</span>
                <span className="text-right">PTS</span>
              </div>
              <ol>
                {rest.map((row) => {
                  const isMe = row.user_id === userId;
                  return (
                    <li
                      key={row.user_id}
                      className={cn(
                        'grid grid-cols-[44px_1fr_72px_56px] items-center border-t border-[#3B2758]/80 px-3.5 py-3 text-sm',
                        isMe && 'bg-[#FFD60A]/12'
                      )}
                    >
                      <span
                        className={cn(
                          'font-extrabold',
                          isMe ? 'text-[#FFD60A]' : 'text-[#CFCBDD]'
                        )}
                      >
                        {row.rank}
                      </span>
                      <span className="truncate font-bold text-[#F4F2FA]">
                        {isMe ? `You · ${row.display_name}` : row.display_name}
                        {row.verified && (
                          <Check
                            className="ml-1 inline size-3.5 text-[#FFD60A]"
                            aria-label="Verified student"
                          />
                        )}
                      </span>
                      <span className="text-center text-[#CFCBDD]">
                        {row.stamps}
                      </span>
                      <span
                        className={cn(
                          'text-right font-extrabold',
                          isMe ? 'text-[#FFD60A]' : 'text-[#F4F2FA]'
                        )}
                      >
                        {row.score}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Violet Motivation Hint + Scan button */}
          <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#9B6CFF] px-4 py-3.5 text-[#12091E]">
            <p className="text-sm font-extrabold leading-snug">
              {myRow && personAbove && pointsToPass
                ? `${pointsToPass} ${pointsToPass === 1 ? 'point' : 'points'} to pass ${personAbove.display_name} (#${personAbove.rank})`
                : myRow && myRow.rank === 1
                  ? 'You are #1! Keep scanning to defend the crown.'
                  : 'Scan a Stamp Station QR to climb the leaderboard'}
            </p>
            <Link
              href="/scan"
              className="inline-flex h-10 shrink-0 items-center rounded-[12px] bg-[#12091E] px-4 text-sm font-extrabold text-[#FFD60A]"
            >
              Scan
            </Link>
          </div>

          <p className="text-xs text-[#9C97B0]">
            Top 3 win prizes · all {totalStamps || 'stamps'} = lucky draw · ✓
            verified @sdmcet.ac.in student
          </p>
        </>
      )}
    </div>
  );
}
