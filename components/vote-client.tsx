'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Check,
  KeyRound,
  Lock,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { castVoteAction, syncOfflineVoteAction } from '@/app/vote/actions';
import type { PollWithEvent } from '@/lib/data/voting';
import type { PollResultRow } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VotePayload {
  poll: PollWithEvent;
  results: PollResultRow[];
  serverTime: string;
}

interface QueuedOfflineVote {
  pollId: string;
  contestantId: string;
  contestantName: string;
  eventId: string;
  code: string;
  castAt: string;
  clientRef: string;
}

const OFFLINE_KEY = 'fiesta26:offline-votes';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<VotePayload>);

interface VoteClientProps {
  initialPoll: PollWithEvent;
  initialResults: PollResultRow[];
  isOpen: boolean;
  isSignedIn: boolean;
  isVerified: boolean;
  initialMyContestantId: string | null;
  initialChangesLeft: number;
}

export function VoteClient({
  initialPoll,
  initialResults,
  isOpen,
  isSignedIn,
  isVerified,
  initialMyContestantId,
  initialChangesLeft,
}: VoteClientProps) {
  const { data, mutate } = useSWR<VotePayload>(
    `/api/vote/${initialPoll.event_id}`,
    fetcher,
    {
      fallbackData: {
        poll: initialPoll,
        results: initialResults,
        serverTime: new Date().toISOString(),
      },
      refreshInterval: 10_000,
      refreshWhenHidden: false,
      keepPreviousData: true,
    }
  );

  const poll = data?.poll ?? initialPoll;
  const results = data?.results ?? initialResults;

  const [myContestantId, setMyContestantId] = useState<string | null>(
    initialMyContestantId
  );
  const [changesLeft, setChangesLeft] = useState<number>(initialChangesLeft);
  const [stageCode, setStageCode] = useState('');
  const [pendingOffline, setPendingOffline] =
    useState<QueuedOfflineVote | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load any saved offline vote for this poll & auto-sync when online
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OFFLINE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as QueuedOfflineVote[];
      const match = list.find((v) => v.pollId === poll.id) ?? null;
      if (match) {
        const frame = window.requestAnimationFrame(() =>
          setPendingOffline(match)
        );
        return () => window.cancelAnimationFrame(frame);
      }
    } catch {
      // Ignore storage errors
    }
    return undefined;
  }, [poll.id]);

  async function trySyncOffline(vote: QueuedOfflineVote) {
    const res = await syncOfflineVoteAction(vote);
    if (res.ok) {
      toast.success(`Saved vote for ${vote.contestantName} counted!`);
      setMyContestantId(vote.contestantId);
      setPendingOffline(null);
      try {
        const raw = window.localStorage.getItem(OFFLINE_KEY);
        const list = raw ? (JSON.parse(raw) as QueuedOfflineVote[]) : [];
        window.localStorage.setItem(
          OFFLINE_KEY,
          JSON.stringify(list.filter((v) => v.clientRef !== vote.clientRef))
        );
      } catch {
        // Ignore
      }
      void mutate();
    } else {
      toast.error(res.message);
    }
  }

  function handleVote(contestant: PollResultRow) {
    if (!isSignedIn) {
      toast.error('Sign in to cast your vote.');
      return;
    }
    if (poll.require_code && !stageCode.trim()) {
      toast.error('Enter the 6-character code shown on the stage screen.');
      return;
    }

    // Offline fallback if browser is offline and require_code is set
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!poll.require_code) {
        toast.error('You are offline. Reconnect to cast your vote.');
        return;
      }
      const queued: QueuedOfflineVote = {
        pollId: poll.id,
        contestantId: contestant.contestant_id,
        contestantName: contestant.name,
        eventId: poll.event_id,
        code: stageCode.trim().toUpperCase(),
        castAt: new Date().toISOString(),
        clientRef: crypto.randomUUID(),
      };
      try {
        const raw = window.localStorage.getItem(OFFLINE_KEY);
        const list = raw ? (JSON.parse(raw) as QueuedOfflineVote[]) : [];
        const next = [
          ...list.filter((v) => v.pollId !== poll.id),
          queued,
        ];
        window.localStorage.setItem(OFFLINE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      setPendingOffline(queued);
      toast.success(
        'Saved offline! Tap "Send saved vote" as soon as signal returns.'
      );
      return;
    }

    startTransition(async () => {
      const res = await castVoteAction({
        pollId: poll.id,
        contestantId: contestant.contestant_id,
        eventId: poll.event_id,
        code: stageCode.trim().toUpperCase() || undefined,
      });

      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      setMyContestantId(contestant.contestant_id);
      if (typeof res.changes_left === 'number') {
        setChangesLeft(res.changes_left);
      }
      toast.success(
        res.reason === 'changed'
          ? `Vote switched to ${contestant.name} (${res.changes_left} changes left)`
          : `Vote counted for ${contestant.name}!`
      );
      void mutate();
    });
  }

  const totalVotes = results[0]?.total_votes ?? 0;
  const showCounts = results[0]?.visible ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/events/${poll.event_id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[#FFD60A]"
        >
          <ArrowLeft className="size-4" />
          Back to event
        </Link>
        {showCounts && (
          <span className="rounded-full bg-[#1F1230] border border-[#3B2758] px-3 py-1 text-xs font-extrabold text-[#FFD60A]">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        )}
      </div>

      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider',
              isOpen
                ? 'bg-[#FF4FD8] text-[#12091E]'
                : 'bg-[#3B2758] text-[#CFCBDD]'
            )}
          >
            {isOpen ? 'VOTING LIVE' : 'VOTING CLOSED'}
          </span>
          {myContestantId && (
            <span className="rounded-full bg-[#FFD60A]/20 px-2.5 py-0.5 text-[11px] font-extrabold text-[#FFD60A]">
              {changesLeft > 0
                ? `${changesLeft} ${changesLeft === 1 ? 'change' : 'changes'} left`
                : 'Vote locked'}
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl leading-tight text-[#F4F2FA]">
          {poll.event?.title ?? poll.title}
        </h1>
        {poll.event?.venue_name && (
          <p className="text-sm text-[#BDB8CF]">{poll.event.venue_name}</p>
        )}
      </header>

      {/* Pending Offline Vote Sync Banner */}
      {pendingOffline && (
        <div className="flex items-center justify-between gap-3 rounded-[20px] border-2 border-[#FFE14D] bg-[#1F1230] p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#FFE14D]">
              <WifiOff className="size-4" /> SAVED OFFLINE VOTE
            </div>
            <p className="text-sm font-bold text-[#F4F2FA]">
              {pendingOffline.contestantName} (code {pendingOffline.code})
            </p>
          </div>
          <button
            type="button"
            onClick={() => void trySyncOffline(pendingOffline)}
            className="h-10 shrink-0 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Send now
          </button>
        </div>
      )}

      {/* Auth / Verified notices */}
      {!isSignedIn && isOpen && (
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#FFD60A] p-4 text-[#12091E] shadow-[4px_4px_0_#FF4FD8]">
          <p className="text-sm font-extrabold">
            Sign in to cast your live vote
          </p>
          <Link
            href={`/login?next=/vote/${poll.event_id}`}
            className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#12091E] px-4 text-xs font-extrabold text-[#FFD60A]"
          >
            Sign in
          </Link>
        </div>
      )}

      {isSignedIn && poll.college_only && !isVerified && isOpen && (
        <div className="flex items-start gap-2.5 rounded-[18px] border border-[#FF9F43] bg-[#FF9F43]/15 p-3.5 text-xs font-semibold text-[#FFE14D]">
          <Lock className="mt-0.5 size-4 shrink-0" />
          This vote is restricted to verified @sdmcet.ac.in student accounts.
        </div>
      )}

      {/* Stage code input when require_code is on */}
      {poll.require_code && isOpen && isSignedIn && (
        <div className="rounded-[20px] border-[1.5px] border-[#FF4FD8] bg-[#1F1230] p-4 space-y-2">
          <label
            htmlFor="stage-code"
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#FF4FD8]"
          >
            <KeyRound className="size-4" /> Stage screen code (changes every 30 s)
          </label>
          <input
            id="stage-code"
            type="text"
            maxLength={8}
            value={stageCode}
            onChange={(e) => setStageCode(e.target.value.toUpperCase())}
            placeholder="E.g. A7F2C9"
            className="h-12 w-full rounded-[14px] border border-[#3B2758] bg-[#12091E] px-4 font-mono text-lg font-extrabold tracking-[0.2em] uppercase text-[#FFD60A] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
          />
        </div>
      )}

      {/* Contestants list */}
      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((c) => {
            const isSelected = c.contestant_id === myContestantId;
            const pct = c.percent ?? 0;
            return (
              <div
                key={c.contestant_id}
                className={cn(
                  'relative overflow-hidden rounded-[22px] border-[1.5px] bg-[#1F1230] p-4 transition-colors',
                  isSelected
                    ? 'border-2 border-[#FFD60A] shadow-[4px_4px_0_#FF4FD8]'
                    : 'border-[#3B2758]'
                )}
              >
                {showCounts && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 bg-[#FFD60A]/12 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-heading text-lg font-extrabold text-[#F4F2FA]">
                        {c.name}
                      </h2>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD60A] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                          <Check className="size-3 stroke-[3]" /> YOUR VOTE
                        </span>
                      )}
                    </div>
                    {c.subtitle && (
                      <p className="truncate text-xs text-[#BDB8CF]">
                        {c.subtitle}
                      </p>
                    )}
                    {showCounts && (
                      <p className="text-xs font-extrabold text-[#FFD60A]">
                        {pct}% · {c.votes ?? 0} votes
                      </p>
                    )}
                  </div>

                  {isOpen && (
                    <button
                      type="button"
                      disabled={isPending || !isSignedIn || (isSelected && true)}
                      onClick={() => handleVote(c)}
                      className={cn(
                        'min-h-11 shrink-0 rounded-[14px] px-4 text-sm font-extrabold transition-colors cursor-pointer disabled:cursor-default',
                        isSelected
                          ? 'bg-[#3B2758] text-[#FFD60A]'
                          : 'bg-[#FFD60A] text-[#12091E] hover:bg-[#FFE14D] disabled:opacity-40'
                      )}
                    >
                      {isSelected ? 'Voted' : myContestantId ? 'Switch' : 'Vote'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-8 text-center text-sm text-[#BDB8CF]">
          Contestants haven&apos;t been added to this vote yet.
        </div>
      )}

      {!showCounts && results.length > 0 && (
        <p className="text-center text-xs text-[#9C97B0]">
          Live vote counts are hidden until organisers announce the winner.
        </p>
      )}
    </div>
  );
}
