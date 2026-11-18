'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/time';

interface ResultRow {
  id: string;
  event_id: string;
  title: string;
  body: string;
  is_live: boolean;
  updated_at: string;
  events?: { title?: string } | Array<{ title?: string }> | null;
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .from('results')
      .select('id, event_id, title, body, is_live, updated_at, events(title)')
      .order('updated_at', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (!active) return;
        setResults((data ?? []) as unknown as ResultRow[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="pt-1 space-y-1">
        <h1 className="font-display text-3xl text-[#F4F2FA]">RESULTS</h1>
        <p className="text-xs text-[#9C97B0]">
          Official Fiesta&apos;26 winners &amp; competition results
        </p>
      </header>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#9C97B0]">
          Loading results…
        </p>
      ) : results.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/50 p-10 text-center space-y-2">
          <Trophy className="mx-auto size-8 text-[#FFE14D]" />
          <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            No results announced yet
          </p>
          <p className="text-xs text-[#9C97B0]">
            Winners will appear here as competitions finish on 25–28 Nov.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => {
            const evTitle = Array.isArray(r.events)
              ? r.events[0]?.title
              : r.events?.title;
            return (
              <Link
                key={r.id}
                href={`/event/?id=${r.event_id}`}
                className="block rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2 hover:border-[#FFD60A]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-[#FFD60A]">
                    {evTitle || 'Competition'} · {r.title}
                  </span>
                  <span className="text-[11px] text-[#9C97B0]">
                    {formatTime(r.updated_at)} IST
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm text-[#CFCBDD]">
                  {r.body}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
