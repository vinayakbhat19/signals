'use client';

import Link from 'next/link';
import { ArrowLeft, Compass, Trophy } from 'lucide-react';

export default function VotePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 pt-6 pb-12 text-center">
      <div className="rounded-[26px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-7 space-y-5 shadow-[5px_5px_0_#FFD60A]">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#FF4FD8]/20 text-[#FF4FD8]">
          <Trophy className="size-8" />
        </span>

        <div className="space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF4FD8]">
            NOTICE FROM ORGANISERS
          </p>
          <h1 className="font-display text-2xl text-[#F4F2FA] sm:text-3xl">
            VOTING HAS BEEN CANCELLED
          </h1>
          <p className="text-sm text-[#BDB8CF] leading-relaxed">
            Audience voting has been officially cancelled by the event organizers.
            All festival competitions are judged directly by the official jury
            panel.
          </p>
        </div>

        <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-4 text-left space-y-2">
          <p className="text-xs font-bold text-[#FFD60A] uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="size-4 text-[#FFD60A]" />
            Join the Campus Treasure Hunt instead!
          </p>
          <p className="text-xs text-[#CFCBDD] leading-relaxed">
            10 secret spots are hidden across SDMCET. Log in, get access to
            Clue #1, find the hidden QR stickers, unlock Clue #2, and climb the
            live Leaderboard!
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/hunt/leaderboard/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-6 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] active:translate-y-0.5 transition-transform"
          >
            <Trophy className="size-4" />
            View Hunt Leaderboard
          </Link>
          <Link
            href="/hunt/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[#3B2758] bg-[#12091E] px-6 text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A] transition-colors"
          >
            <Compass className="size-4" />
            Open Treasure Hunt
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#9C97B0] hover:text-[#F4F2FA] pt-1"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
