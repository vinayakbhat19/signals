import Image from 'next/image';
import Link from 'next/link';
import { Award, CalendarDays, Trophy, Vote } from 'lucide-react';
import { listEvents } from '@/lib/data/events';
import { getLeaderboard } from '@/lib/data/hunt';
import { listResults } from '@/lib/data/results';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 60;

interface ArchiveVoteRow {
  poll_id: string;
  contestant_id: string;
  name: string;
  votes: number;
  percent: number | null;
}

export default async function FestArchivePage() {
  const [events, results, leaderboard] = await Promise.all([
    listEvents().catch(() => []),
    listResults().catch(() => []),
    getLeaderboard(10).catch(() => []),
  ]);

  let archivedVotes: ArchiveVoteRow[] = [];
  try {
    const supabase = createPublicClient();
    const { data } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (k: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: ArchiveVoteRow[] | null }>;
            };
          };
        };
      }
    )
      .from('poll_results_archive')
      .select('poll_id, contestant_id, name, votes, percent')
      .order('votes', { ascending: false })
      .limit(20);
    if (data && data.length > 0) {
      archivedVotes = data;
    } else {
      const { data: liveVotes } = await supabase
        .from('poll_results')
        .select('poll_id, contestant_id, name, votes, percent')
        .order('votes', { ascending: false })
        .limit(20);
      archivedVotes = (liveVotes ?? [])
        .filter((v) => v.votes != null)
        .map((v) => ({
          poll_id: v.poll_id,
          contestant_id: v.contestant_id,
          name: v.name,
          votes: v.votes ?? 0,
          percent: v.percent,
        }));
    }
  } catch {
    archivedVotes = [];
  }

  return (
    <div className="space-y-6">
      <header className="halftone-band rounded-[26px] border-[1.5px] border-[#3B2758] p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/fiesta26-logo.png"
              alt="Fiesta'26"
              width={116}
              height={44}
              className="h-11 w-auto object-contain"
            />
            <span className="rounded-lg bg-[#FFD60A] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#12091E]">
              READ-ONLY ARCHIVE
            </span>
          </div>
          <Link
            href="/signals"
            className="inline-flex h-10 items-center rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
          >
            Back to Signals →
          </Link>
        </div>
        <h1 className="font-display text-3xl text-[#F4F2FA]">
          FIESTA&apos;26 MEMORIES &amp; RESULTS
        </h1>
        <p className="text-sm text-[#CFCBDD]">
          SDM College of Engineering &amp; Technology, Dharwad · 25–27 Nov 2026.
          Thank you to everyone who participated!
        </p>
      </header>

      {/* Stamp Hunt Top 10 */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
          <Trophy className="size-5 text-[#FFE14D]" />
          Stamp Hunt Final Top 10
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-[#9C97B0]">
            No Stamp Hunt entries recorded yet.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.user_id}
                className="flex items-center justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <span className="truncate font-bold text-[#F4F2FA]">
                  #{idx + 1} · {entry.display_name || 'Student'}
                </span>
                <span className="shrink-0 font-extrabold text-[#FFD60A]">
                  {entry.score} pts ({entry.stamps} stamps)
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audience Voting Favourites */}
      {archivedVotes.length > 0 && (
        <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
            <Vote className="size-5 text-[#FF4FD8]" />
            Audience Voting Favourites
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {archivedVotes.map((row) => (
              <div
                key={`${row.poll_id}-${row.contestant_id}`}
                className="flex items-center justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <span className="truncate font-bold text-[#F4F2FA]">
                  {row.name}
                </span>
                <span className="shrink-0 font-extrabold text-[#FF4FD8]">
                  {row.votes} votes
                  {row.percent != null ? ` (${row.percent}%)` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Official Competition Results */}
      {results.length > 0 && (
        <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
            <Award className="size-5 text-[#22D3EE]" />
            Official Winners &amp; Results
          </h2>
          <div className="space-y-2.5">
            {results.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[#3B2758] bg-[#12091E] p-3.5 space-y-1"
              >
                <p className="text-xs font-extrabold uppercase text-[#22D3EE]">
                  {r.event_title} · {r.title}
                </p>
                <p className="whitespace-pre-line text-sm text-[#CFCBDD]">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All 21 Competitions */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-extrabold text-[#F4F2FA]">
          <CalendarDays className="size-5 text-[#FFD60A]" />
          All {events.length} Fiesta&apos;26 Competitions
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 py-2.5 hover:border-[#FFD60A]"
            >
              <p className="truncate text-sm font-bold text-[#F4F2FA]">
                {ev.code ? `${ev.code} · ` : ''}
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
