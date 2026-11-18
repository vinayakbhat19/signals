'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Archive, ArrowRight, Sparkles, Trophy, Vote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function FestOverPage() {
  const [topHunters, setTopHunters] = useState<
    Array<{ user_id: string; display_name: string; score: number }>
  >([]);
  const [topVotes, setTopVotes] = useState<Array<{ name: string; votes: number }>>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('stamp_leaderboard')
        .select('user_id, display_name, score')
        .order('score', { ascending: false })
        .limit(3),
      supabase
        .from('poll_results_archive')
        .select('name, votes')
        .order('votes', { ascending: false })
        .limit(3),
    ])
      .then(([hRes, vRes]) => {
        if (hRes.data) setTopHunters(hRes.data as typeof topHunters);
        if (vRes.data) setTopVotes(vRes.data as typeof topVotes);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <header className="halftone-band rounded-[26px] border-[1.5px] border-[#3B2758] p-6 text-center space-y-3">
        <Image
          src="/brand/fiesta26-logo.png"
          alt="Fiesta'26"
          width={150}
          height={58}
          className="mx-auto h-14 w-auto object-contain"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD60A] px-3 py-1 text-[11px] font-extrabold uppercase text-[#12091E]">
          <Sparkles className="size-3.5" />
          25–27 NOV 2026 · SDMCET DHARWAD
        </span>
        <h1 className="font-display text-4xl leading-none text-[#F4F2FA]">
          WHAT A WRAP!
        </h1>
        <p className="text-sm text-[#CFCBDD]">
          Fiesta&apos;26 is officially over — thank you to every performer,
          volunteer, and student! Your app is now back in <strong>Signals</strong>{' '}
          mode.
        </p>
      </header>

      {topHunters.length > 0 && (
        <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2.5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Trophy className="size-5 text-[#FFE14D]" />
            Treasure Hunt Champions
          </h2>
          {topHunters.map((h, i) => (
            <div
              key={h.user_id}
              className="flex justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
            >
              <span className="font-bold">
                #{i + 1} · {h.display_name}
              </span>
              <span className="font-extrabold text-[#FFD60A]">{h.score} pts</span>
            </div>
          ))}
        </section>
      )}

      {topVotes.length > 0 && (
        <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2.5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Vote className="size-5 text-[#FF4FD8]" />
            Audience Favourites
          </h2>
          {topVotes.map((v, i) => (
            <div
              key={`${v.name}-${i}`}
              className="flex justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
            >
              <span className="font-bold">{v.name}</span>
              <span className="font-extrabold text-[#FF4FD8]">{v.votes} votes</span>
            </div>
          ))}
        </section>
      )}

      <div className="space-y-2.5">
        <Link
          href="/signals/"
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8]"
        >
          Open Signals
          <ArrowRight className="size-5" />
        </Link>
        <Link
          href="/fest-archive/"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#3B2758] bg-[#1F1230] text-sm font-bold text-[#F4F2FA]"
        >
          <Archive className="size-4 text-[#FFD60A]" />
          Browse Fiesta&apos;26 Archive
        </Link>
      </div>
    </div>
  );
}
