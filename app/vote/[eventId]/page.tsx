import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Vote } from 'lucide-react';
import { VoteClient } from '@/components/vote-client';
import { getProfile } from '@/lib/auth';
import { getEvent } from '@/lib/data/events';
import {
  getMyVote,
  getPollByEvent,
  getPollResults,
  isPollOpenNow,
} from '@/lib/data/voting';

export const dynamic = 'force-dynamic';

export default async function EventVotePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, poll, profile] = await Promise.all([
    getEvent(eventId),
    getPollByEvent(eventId),
    getProfile(),
  ]);

  if (!event) {
    notFound();
  }

  if (!poll || !poll.enabled) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFD60A]"
        >
          <ArrowLeft className="size-4" /> Back to {event.title}
        </Link>
        <div className="flex flex-col items-center gap-3 rounded-[24px] border-[1.5px] border-dashed border-[#3B2758] bg-[#1F1230]/70 p-8">
          <Vote className="size-10 text-[#FF4FD8]" />
          <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
            Audience voting is not open
          </h1>
          <p className="text-sm text-[#BDB8CF]">
            Organisers haven&apos;t enabled live voting for{' '}
            <strong>{event.title}</strong> right now.
          </p>
        </div>
      </div>
    );
  }

  const [results, myVote] = await Promise.all([
    getPollResults(poll.id),
    profile ? getMyVote(poll.id, profile.id) : Promise.resolve(null),
  ]);

  return (
    <VoteClient
      initialPoll={poll}
      initialResults={results}
      isOpen={isPollOpenNow(poll)}
      isSignedIn={Boolean(profile)}
      isVerified={Boolean(profile?.college_verified)}
      initialMyContestantId={myVote?.contestant_id ?? null}
      initialChangesLeft={myVote ? Math.max(0, 3 - myVote.change_count) : 3}
    />
  );
}
