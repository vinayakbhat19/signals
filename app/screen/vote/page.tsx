'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import { useLiveFeed } from '@/lib/live-store';

interface PollResultRow {
  contestant_id: string;
  name: string;
  subtitle: string | null;
  sort: number;
  votes: number | null;
  percent: number | null;
}

interface PublicPoll {
  id: string;
  event_id: string;
  title: string | null;
  enabled: boolean;
  results_visibility: 'live' | 'after_close' | 'hidden';
}

function StageVoteScreenInner() {
  const params = useSearchParams();
  const eventId = params.get('id') ?? '';
  const { feed } = useLiveFeed();
  const [poll, setPoll] = useState<PublicPoll | null>(null);
  const [rows, setRows] = useState<PollResultRow[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [voteUrl, setVoteUrl] = useState<string>('');

  const event = feed.events.find((e) => e.id === eventId) ?? null;

  const load = useCallback(async () => {
    if (!eventId) return;
    const supabase = createClient();
    const { data: pollData } = await supabase
      .from('polls')
      .select('id, event_id, title, enabled, results_visibility')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!pollData) {
      setPoll(null);
      return;
    }

    const p = pollData as PublicPoll;
    setPoll(p);

    const { data: resRows } = await supabase
      .from('poll_results')
      .select('contestant_id, name, subtitle, sort, votes, percent')
      .eq('poll_id', p.id)
      .order('votes', { ascending: false, nullsFirst: false })
      .order('sort', { ascending: true });

    setRows((resRows ?? []) as PollResultRow[]);
  }, [eventId]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void load());
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 5_000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!eventId) return;
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const target = `${origin.replace(/\/$/, '')}/vote/?id=${encodeURIComponent(eventId)}`;
    const raf = window.requestAnimationFrame(() => {
      setVoteUrl(target);
      void QRCode.toDataURL(target, {
        width: 320,
        margin: 2,
        color: { dark: '#100A1C', light: '#FFFFFF' },
      }).then(setQrDataUrl);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [eventId]);

  const totalVotes = rows.reduce((sum, r) => sum + (r.votes ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#100A1C] text-[#F5F2FB] p-8 md:p-12 flex flex-col justify-between">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FFDC14]">
            FIESTA&apos;26 · SDMCET DHARWAD · LIVE AUDIENCE VOTE
          </p>
          <h1 className="mt-1 text-3xl md:text-5xl font-black tracking-tight">
            {poll?.title || event?.title || 'Audience Voting'}
          </h1>
        </div>
        <div className="rounded-full bg-[#E83295]/20 border border-[#E83295]/50 px-5 py-2 text-sm font-black uppercase tracking-wider text-[#FFDC14]">
          {poll?.enabled ? `LIVE · ${totalVotes} votes` : 'VOTING CLOSED'}
        </div>
      </header>

      <div className="my-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-center flex-1">
        <div className="space-y-4">
          {!eventId ? (
            <p className="text-lg text-[#C9C1D9]">
              Open this stage screen with <code>?id=&lt;eventId&gt;</code>.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-lg text-[#C9C1D9]">
              Waiting for contestants to be added for this poll…
            </p>
          ) : (
            rows.slice(0, 8).map((row, idx) => {
              const pct = Math.max(0, Math.min(100, Math.round(row.percent ?? 0)));
              const isLeader = idx === 0 && (row.votes ?? 0) > 0;
              return (
                <div
                  key={row.contestant_id}
                  className="rounded-2xl border border-white/10 bg-[#1F1534] p-4"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <span className="mr-3 text-xl font-black text-[#FFDC14]">
                        #{idx + 1}
                      </span>
                      <span className="text-xl md:text-2xl font-extrabold">
                        {row.name}
                      </span>
                      {row.subtitle ? (
                        <span className="ml-2 text-sm text-[#C9C1D9]">
                          · {row.subtitle}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-2xl font-black text-[#FFDC14]">
                        {poll?.results_visibility === 'hidden' ? '—' : `${pct}%`}
                      </span>
                      {row.votes !== null && poll?.results_visibility !== 'hidden' ? (
                        <span className="ml-2 text-sm text-[#C9C1D9]">
                          ({row.votes})
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={
                        isLeader
                          ? 'h-full rounded-full bg-gradient-to-r from-[#FFDC14] to-[#E83295] transition-all duration-500'
                          : 'h-full rounded-full bg-[#36B5E8] transition-all duration-500'
                      }
                      style={{
                        width:
                          poll?.results_visibility === 'hidden'
                            ? '0%'
                            : `${pct}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="rounded-3xl border border-white/15 bg-[#1F1534] p-6 text-center flex flex-col items-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#FFDC14]">
            SCAN TO VOTE NOW
          </p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Scan to vote QR"
              className="mt-4 h-64 w-64 rounded-2xl bg-white p-2"
            />
          ) : (
            <div className="mt-4 h-64 w-64 rounded-2xl bg-white/10 animate-pulse" />
          )}
          {voteUrl ? (
            <p className="mt-4 text-xs text-[#C9C1D9] break-all">{voteUrl}</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default function StageVoteScreenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#100A1C] text-[#F5F2FB] flex items-center justify-center text-sm">
          Loading stage screen…
        </div>
      }
    >
      <StageVoteScreenInner />
    </Suspense>
  );
}
