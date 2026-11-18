'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Megaphone, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';
import { formatTimeAgo } from '@/lib/time';

export default function UpdatesPage() {
  const { feed, refresh } = useLiveFeed();
  const { isOrganiser } = useAuth();
  const [tab, setTab] = useState<'all' | 'changes' | 'notices'>('all');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const combined = [
    ...feed.changes.map((c) => ({
      id: `ch-${c.id}`,
      rawId: c.id,
      kind: 'change' as const,
      message: c.message,
      created_at: c.created_at,
      event_id: c.event_id,
      urgent: false,
    })),
    ...feed.notices.map((n) => ({
      id: `no-${n.id}`,
      rawId: n.id,
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

  async function handleDelete(item: (typeof combined)[number]) {
    if (!isOrganiser) return;
    setDeletingKey(item.id);
    const supabase = createClient();
    const table = item.kind === 'change' ? 'event_changes' : 'announcements';
    const { error } = await supabase.from(table).delete().eq('id', item.rawId);
    setDeletingKey(null);
    if (error) {
      toast.error(error.message || 'Could not delete update.');
    } else {
      toast.success(
        item.kind === 'change' ? 'Change log deleted.' : 'Notice deleted.'
      );
      await refresh();
    }
  }

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
              <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase">
                <span className="inline-flex items-center gap-1.5">
                  <Megaphone className="size-3.5" />
                  {item.urgent
                    ? 'URGENT NOTICE'
                    : item.kind === 'change'
                      ? 'SCHEDULE CHANGE'
                      : 'NOTICE'}
                </span>
                <div className="flex items-center gap-2">
                  <span className={item.urgent ? 'opacity-80' : 'text-[#9C97B0]'}>
                    {formatTimeAgo(item.created_at, feed.server_time)}
                  </span>
                  {isOrganiser && (
                    <button
                      type="button"
                      disabled={deletingKey === item.id}
                      onClick={() => void handleDelete(item)}
                      aria-label="Delete update"
                      title="Delete update"
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold cursor-pointer disabled:opacity-50 ${
                        item.urgent
                          ? 'bg-[#12091E] text-[#FF4F5E]'
                          : 'border border-[#FF4F5E]/40 bg-[#FF4F5E]/15 text-[#FF4F5E] hover:bg-[#FF4F5E]/25'
                      }`}
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  )}
                </div>
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
