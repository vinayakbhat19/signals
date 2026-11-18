'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Trophy, Vote } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';

export default function FestArchivePage() {
  const { feed } = useLiveFeed();
  const [leaders, setLeaders] = useState<
    Array<{ user_id: string; display_name: string; score: number; stamps: number }>
  >([]);
  const [votes, setVotes] = useState<
    Array<{ poll_id: string; contestant_id: string; name: string; votes: number; percent: number | null }>
  >([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('stamp_leaderboard')
        .select('user_id, display_name, score, stamps')
        .order('score', { ascending: false })
        .limit(10),
      supabase
        .from('poll_results_archive')
        .select('poll_id, contestant_id, name, votes, percent')
        .order('votes', { ascending: false })
        .limit(20),
    ])
      .then(([lRes, vRes]) => {
        if (lRes.data) setLeaders(lRes.data as typeof leaders);
        if (vRes.data) setVotes(vRes.data as typeof votes);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header className="halftone-band rounded-[26px] border border-[#3B2758] p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/fiesta26-logo.png"
              alt="Fiesta'26"
              width={116}
              height={44}
              className="h-11 w-auto object-contain"
            />
            <span className="rounded-lg bg-[#FFD60A] px-2.5 py-1 text-[11px] font-extrabold text-[#12091E]">
              READ-ONLY ARCHIVE
            </span>
          </div>
          <Link
            href="/signals/"
            className="inline-flex h-10 items-center rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
          >
            Back to Signals →
          </Link>
        </div>
        <h1 className="font-display text-3xl text-[#F4F2FA]">
          FIESTA&apos;26 MEMORIES &amp; RESULTS
        </h1>
      </header>

      <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
          <Trophy className="size-5 text-[#FFE14D]" />
          Treasure Hunt Top 10
        </h2>
        {leaders.length === 0 ? (
          <p className="text-xs text-[#9C97B0]">No entries recorded yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {leaders.map((l, i) => (
              <div
                key={l.user_id}
                className="flex justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <span className="font-bold">
                  #{i + 1} · {l.display_name}
                </span>
                <span className="font-extrabold text-[#FFD60A]">
                  {l.score} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {votes.length > 0 && (
        <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
            <Vote className="size-5 text-[#FF4FD8]" />
            Audience Voting Favourites
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {votes.map((v) => (
              <div
                key={`${v.poll_id}-${v.contestant_id}`}
                className="flex justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <span className="font-bold">{v.name}</span>
                <span className="font-extrabold text-[#FF4FD8]">
                  {v.votes} votes
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
          <CalendarDays className="size-5 text-[#FFD60A]" />
          All {feed.events.length} Fiesta&apos;26 Competitions
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {feed.events.map((ev) => (
            <Link
              key={ev.id}
              href={`/event/?id=${ev.id}`}
              className="rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 py-2.5 hover:border-[#FFD60A]"
            >
              <p className="truncate text-sm font-bold text-[#F4F2FA]">
                {ev.title}
              </p>
              <p className="truncate text-xs text-[#9C97B0]">
                {ev.venue_name || 'SDMCET Campus'}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
