'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';
import { formatTime } from '@/lib/time';

interface PollResultRow {
  contestant_id: string;
  name: string;
  subtitle: string | null;
  photo_url: string | null;
  sort: number;
  votes: number | null;
  percent: number | null;
}

interface PublicPoll {
  id: string;
  event_id: string;
  title: string | null;
  enabled: boolean;
  opens_at: string | null;
  closes_at: string | null;
  results_visibility: 'live' | 'after_close' | 'hidden';
  require_code: boolean;
}

function VoteCompetitionView({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const { feed } = useLiveFeed();
  const [poll, setPoll] = useState<PublicPoll | null>(null);
  const [rows, setRows] = useState<PollResultRow[]>([]);
  const [myContestantId, setMyContestantId] = useState<string | null>(null);
  const [stageCode, setStageCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  const event = feed.events.find((e) => e.id === eventId) ?? null;

  const loadPoll = useCallback(async () => {
    const supabase = createClient();
    const { data: pollData } = await supabase
      .from('polls')
      .select(
        'id, event_id, title, enabled, opens_at, closes_at, results_visibility, require_code'
      )
      .eq('event_id', eventId)
      .maybeSingle();

    if (!pollData) {
      setPoll(null);
      setLoading(false);
      return;
    }

    const p = pollData as PublicPoll;
    setPoll(p);

    const { data: resRows } = await supabase
      .from('poll_results')
      .select('contestant_id, name, subtitle, photo_url, sort, votes, percent')
      .eq('poll_id', p.id)
      .order('votes', { ascending: false, nullsFirst: false })
      .order('sort', { ascending: true });

    setRows((resRows ?? []) as PollResultRow[]);

    if (user) {
      const { data: myVote } = await supabase
        .from('votes')
        .select('contestant_id')
        .eq('poll_id', p.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (myVote?.contestant_id) {
        setMyContestantId(String(myVote.contestant_id));
      }
    }
    setLoading(false);
  }, [eventId, user]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void loadPoll());
    // Poll results every 10 s on vote page only (HOSTING_CLOUDFLARE.md §3.4)
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadPoll();
    }, 10_000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [loadPoll]);

  async function castVote(contestantId: string) {
    if (!poll) return;
    setVotingId(contestantId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('cast_vote', {
        p_poll: poll.id,
        p_contestant: contestantId,
        p_code: poll.require_code ? stageCode.trim().toUpperCase() : null,
      });

      if (error) {
        toast.error(error.message || 'Could not submit vote.');
        setVotingId(null);
        return;
      }

      const res = data as { ok?: boolean; message?: string; reason?: string };
      if (!res?.ok) {
        toast.error(res?.message || 'Vote could not be recorded.');
      } else {
        setMyContestantId(contestantId);
        toast.success(res.message || 'Your vote is counted!');
        await loadPoll();
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setVotingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!poll || !poll.enabled) {
    return (
      <div className="mx-auto max-w-md py-12 text-center space-y-4">
        <Vote className="mx-auto size-10 text-[#9C97B0]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">VOTING NOT OPEN</h1>
        <p className="text-sm text-[#BDB8CF]">
          Audience voting is not open for{' '}
          <strong>{event?.title || 'this event'}</strong> right now.
        </p>
        <Link
          href="/vote/"
          className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
        >
          See all open votes
        </Link>
      </div>
    );
  }

  const totalVotes = rows.reduce((s, r) => s + (r.votes ?? 0), 0);
  const showCounts = rows.some((r) => r.votes != null);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/vote/"
          className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#FF4FD8]">
            LIVE AUDIENCE VOTE {showCounts ? `· ${totalVotes} VOTES` : ''}
          </p>
          <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
            {poll.title || event?.title || 'Audience Vote'}
          </h1>
          {poll.closes_at && (
            <p className="text-xs text-[#9C97B0]">
              Closes at {formatTime(poll.closes_at)} IST
            </p>
          )}
        </div>
      </div>

      {poll.require_code && (
        <div className="rounded-2xl border border-[#FFD60A]/50 bg-[#1F1230] p-4 space-y-2">
          <label className="block text-xs font-bold text-[#FFD60A]">
            Stage screen code (optional / required if enabled)
          </label>
          <input
            type="text"
            maxLength={8}
            value={stageCode}
            onChange={(e) => setStageCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 font-mono text-base tracking-[0.2em] text-[#F4F2FA] uppercase outline-none focus:border-[#FFD60A]"
          />
        </div>
      )}

      {!user && (
        <Link
          href={`/login/?next=${encodeURIComponent(`/vote/?id=${eventId}`)}`}
          className="flex h-12 items-center justify-center rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
        >
          Sign in with Google or email to vote →
        </Link>
      )}

      <div className="space-y-3">
        {rows.map((c) => {
          const isMine = myContestantId === c.contestant_id;
          const pct = c.percent ?? 0;
          return (
            <div
              key={c.contestant_id}
              className={`rounded-[20px] border-[1.5px] p-4 space-y-3 ${
                isMine
                  ? 'border-[#FFD60A] bg-[#FFD60A]/10'
                  : 'border-[#3B2758] bg-[#1F1230]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg font-extrabold text-[#F4F2FA]">
                    {c.name}
                  </p>
                  {c.subtitle && (
                    <p className="truncate text-xs text-[#9C97B0]">
                      {c.subtitle}
                    </p>
                  )}
                </div>
                {user ? (
                  <button
                    type="button"
                    disabled={votingId !== null}
                    onClick={() => void castVote(c.contestant_id)}
                    className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-extrabold cursor-pointer disabled:opacity-50 ${
                      isMine
                        ? 'bg-[#FFD60A] text-[#12091E]'
                        : 'border border-[#FFD60A] bg-[#12091E] text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#12091E]'
                    }`}
                  >
                    {votingId === c.contestant_id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isMine ? (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        Your vote
                      </>
                    ) : (
                      'Vote'
                    )}
                  </button>
                ) : (
                  <Link
                    href={`/login/?next=${encodeURIComponent(`/vote/?id=${eventId}`)}`}
                    className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
                  >
                    Vote
                  </Link>
                )}
              </div>

              {showCounts && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#CFCBDD]">
                    <span>{c.votes ?? 0} votes</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#12091E]">
                    <div
                      className="h-full rounded-full bg-[#FF4FD8] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showCounts && (
        <p className="text-center text-xs font-semibold text-[#9C97B0]">
          {poll.results_visibility === 'after_close'
            ? 'Live counts will be revealed right after voting closes.'
            : 'Results will be announced live on stage.'}
        </p>
      )}
    </div>
  );
}

function VoteHubInner() {
  const params = useSearchParams();
  const id = params.get('id');
  const { feed } = useLiveFeed();

  if (id) {
    return <VoteCompetitionView eventId={id} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="pt-1 space-y-1">
        <h1 className="font-display text-3xl text-[#F4F2FA] sm:text-4xl">
          AUDIENCE VOTING
        </h1>
        <p className="text-xs text-[#9C97B0]">
          Tap an open competition below to vote for your favourite act — open to
          everyone!
        </p>
      </header>

      {feed.polls.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-10 text-center space-y-3">
          <Vote className="mx-auto size-9 text-[#9C97B0]" />
          <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            No live polls open right now
          </h2>
          <p className="text-xs text-[#9C97B0]">
            Hosts open audience voting right during outdoor Fiesta&apos;26
            performances. Check back during events!
          </p>
          <Link
            href="/events/"
            className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
          >
            Browse events
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.polls.map((p) => {
            const ev = feed.events.find((e) => e.id === p.event_id);
            return (
              <Link
                key={p.poll_id}
                href={`/vote/?id=${p.event_id}`}
                className="flex items-center justify-between gap-3 rounded-[22px] border-2 border-[#FF4FD8] bg-[#1F1230] p-4 shadow-[4px_4px_0_#FFD60A]"
              >
                <div className="min-w-0 space-y-1">
                  <span className="inline-block rounded-full bg-[#FF4FD8] px-2.5 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                    VOTING OPEN
                  </span>
                  <p className="truncate font-heading text-xl font-extrabold text-[#F4F2FA]">
                    {p.title || ev?.title || 'Live Poll'}
                  </p>
                  {p.closes_at && (
                    <p className="text-xs text-[#BDB8CF]">
                      Closes at {formatTime(p.closes_at)} IST
                    </p>
                  )}
                </div>
                <ChevronRight className="size-5 shrink-0 text-[#FFD60A]" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-[#9C97B0]">Loading voting…</div>}>
      <VoteHubInner />
    </Suspense>
  );
}
