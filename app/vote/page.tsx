import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Radio, Vote } from 'lucide-react';
import { isPollOpenNow, listPolls } from '@/lib/data/voting';
import { readWithFallback } from '@/lib/resilience';
import { formatTime } from '@/lib/time';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Audience Voting',
  description: "Vote live in Fiesta'26 competitions.",
};

export default async function VoteHubPage() {
  const { data: polls } = await readWithFallback(
    'page:vote-hub',
    () => listPolls(true),
    [],
    3000
  );

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1 pt-1">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FF4FD8]">
          FIESTA&apos;26 · LIVE STAGE BALLOTS
        </span>
        <h1 className="font-display text-[34px] leading-none text-[#F4F2FA]">
          AUDIENCE VOTE
        </h1>
      </header>

      {polls.length > 0 ? (
        <div className="space-y-3">
          {polls.map((poll) => {
            const open = isPollOpenNow(poll, now);
            return (
              <Link
                key={poll.id}
                href={`/vote/${poll.event_id}`}
                className={
                  open
                    ? 'flex items-center justify-between gap-3 rounded-[22px] border-2 border-[#FFD60A] bg-[#1F1230] p-4 shadow-[4px_4px_0_#FF4FD8]'
                    : 'flex items-center justify-between gap-3 rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4'
                }
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {open ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD60A] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#12091E]">
                        <Radio className="size-3" /> VOTE OPEN
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#3B2758] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#CFCBDD]">
                        {poll.opens_at && now < new Date(poll.opens_at)
                          ? `OPENS ${formatTime(poll.opens_at)}`
                          : 'CLOSED'}
                      </span>
                    )}
                    {poll.college_only && (
                      <span className="rounded-full border border-[#3B2758] px-2 py-0.5 text-[10px] font-bold text-[#BDB8CF]">
                        @sdmcet.ac.in only
                      </span>
                    )}
                    {poll.require_code && (
                      <span className="rounded-full border border-[#FF4FD8]/40 px-2 py-0.5 text-[10px] font-bold text-[#FF4FD8]">
                        Stage code required
                      </span>
                    )}
                  </div>
                  <h2 className="truncate font-heading text-xl font-extrabold text-[#F4F2FA]">
                    {poll.event?.title ?? poll.title}
                  </h2>
                  {poll.event?.venue_name && (
                    <p className="text-xs text-[#BDB8CF]">
                      {poll.event.venue_name}
                    </p>
                  )}
                </div>
                <ArrowRight className="size-5 shrink-0 text-[#FFD60A]" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/60 px-6 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#FF4FD8] text-[#12091E] shadow-[4px_4px_0_#FFD60A]">
            <Vote className="size-8 stroke-[2.2]" />
          </span>
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
              No audience polls are open right now
            </h2>
            <p className="max-w-sm text-sm text-[#BDB8CF]">
              When organisers open live voting for a competition (like Singing,
              Dance, or Battle of Bands), it will appear here instantly.
            </p>
          </div>
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center rounded-[14px] bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
          >
            Browse Fiesta&apos;26 events
          </Link>
        </div>
      )}
    </div>
  );
}
