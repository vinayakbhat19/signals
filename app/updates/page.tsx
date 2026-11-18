'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Megaphone, Sparkles } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { formatTimeAgo } from '@/lib/time';

export default function UpdatesPage() {
  const { feed } = useLiveFeed();
  const [tab, setTab] = useState<'all' | 'changes' | 'notices'>('all');

  const combined = [
    ...feed.changes.map((c) => ({
      id: `ch-${c.id}`,
      kind: 'change' as const,
      message: c.message,
      created_at: c.created_at,
      event_id: c.event_id,
      urgent: false,
    })),
    ...feed.notices.map((n) => ({
      id: `no-${n.id}`,
      kind: 'notice' as const,
      message: n.message,
      created_at: n.created_at,
      event_id: n.event_id,
      urgent: n.priority === 'urgent',
    })),
  ]
    .filter((item) => {
      if (tab === 'changes') return item.kind === 'change';
      if (tab === 'notices') return item.kind === 'notice';
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="font-display text-3xl text-[#F4F2FA]">UPDATES</h1>
          <p className="text-xs text-[#9C97B0]">
            Automatic schedule changes &amp; official committee notices
          </p>
        </div>
        <Link
          href="/account/permissions/"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
        >
          <Bell className="size-4" />
          Get phone alerts
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-[14px] border border-[#3B2758] bg-[#1F1230] p-1">
        {(['all', 'changes', 'notices'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-9 rounded-[10px] text-xs font-extrabold capitalize cursor-pointer ${
              tab === t
                ? 'bg-[#FFD60A] text-[#12091E]'
                : 'text-[#BDB8CF]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {combined.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/50 p-10 text-center space-y-2">
          <Sparkles className="mx-auto size-6 text-[#9C97B0]" />
          <p className="text-sm font-bold text-[#F4F2FA]">No updates yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {combined.map((item) => (
            <article
              key={item.id}
              className={`rounded-[20px] border p-4 space-y-2 ${
                item.urgent
                  ? 'border-[#FFE14D] bg-[#FFE14D] text-[#12091E]'
                  : 'border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase">
                <span className="inline-flex items-center gap-1.5">
                  <Megaphone className="size-3.5" />
                  {item.urgent
                    ? 'URGENT NOTICE'
                    : item.kind === 'change'
                      ? 'SCHEDULE CHANGE'
                      : 'NOTICE'}
                </span>
                <span className={item.urgent ? 'opacity-80' : 'text-[#9C97B0]'}>
                  {formatTimeAgo(item.created_at, feed.server_time)}
                </span>
              </div>
              <p className="text-sm font-bold leading-relaxed">{item.message}</p>
              {item.event_id && (
                <Link
                  href={`/event/?id=${item.event_id}`}
                  className={`inline-block text-xs font-extrabold underline ${
                    item.urgent ? 'text-[#12091E]' : 'text-[#FFD60A]'
                  }`}
                >
                  Open event →
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
