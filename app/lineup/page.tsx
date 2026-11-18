'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Users } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import type { ParticipantPublic } from '@/lib/types';

function LineupInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { feed } = useLiveFeed();
  const [list, setList] = useState<ParticipantPublic[]>([]);
  const [loading, setLoading] = useState(true);

  const event = feed.events.find((e) => e.id === id) ?? null;

  useEffect(() => {
    if (!id) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from('participants_public')
      .select(
        'id, event_id, name, team, college, department, status, performance_order'
      )
      .eq('event_id', id)
      .order('performance_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setList((data ?? []) as ParticipantPublic[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={id ? `/event/?id=${id}` : '/events/'}
          className="flex size-11 items-center justify-center rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#FF4FD8]">
            LIVE LINE-UP
          </p>
          <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
            {event?.title || 'Event Line-up'}
          </h1>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#9C97B0]">
          Loading line-up…
        </p>
      ) : list.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-8 text-center space-y-2">
          <Users className="mx-auto size-7 text-[#9C97B0]" />
          <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            Line-up not published yet
          </p>
          <p className="text-xs text-[#9C97B0]">
            The host will publish the performing order shortly before the event
            begins.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((p, idx) => {
            const onStage = p.status === 'on_stage';
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-[18px] border p-3.5 ${
                  onStage
                    ? 'border-2 border-[#FF4FD8] bg-[#FF4FD8]/15'
                    : 'border-[#3B2758] bg-[#1F1230]'
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#2A1840] font-heading text-base font-extrabold text-[#FFD60A]">
                  #{p.performance_order ?? idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#F4F2FA]">
                    {p.team ? `${p.team} · ${p.name}` : p.name}
                  </p>
                  <p className="truncate text-xs text-[#9C97B0]">
                    {[p.department, p.college].filter(Boolean).join(' · ') ||
                      'Participant'}
                  </p>
                </div>
                {onStage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF4FD8] px-2.5 py-1 text-[10px] font-extrabold text-[#12091E]">
                    <Sparkles className="size-3" />
                    ON STAGE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LineupPage() {
  return (
    <Suspense fallback={null}>
      <LineupInner />
    </Suspense>
  );
}
