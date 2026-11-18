'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Megaphone, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveFeed } from '@/lib/live-store';
import { createClient } from '@/lib/supabase/client';
import { formatDay, formatRange, formatTimeAgo } from '@/lib/time';
import type { EventStatus } from '@/lib/types';

export default function AdminDashboardPage() {
  const { feed, refresh } = useLiveFeed();
  const [noticeText, setNoticeText] = useState('');
  const [noticePriority, setNoticePriority] = useState<'normal' | 'urgent'>('normal');
  const [resultEventId, setResultEventId] = useState('');
  const [resultTitle, setResultTitle] = useState('Official Winners');
  const [resultBody, setResultBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function quickUpdateEvent(
    id: string,
    patch: { starts_at?: string; ends_at?: string; status?: EventStatus; venue_id?: string | null }
  ) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('events').update(patch).eq('id', id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Event updated! Students will see the change within seconds.');
      await refresh();
    }
  }

  async function delay15(ev: (typeof feed.events)[number]) {
    const ns = new Date(new Date(ev.starts_at).getTime() + 15 * 60 * 1000).toISOString();
    const ne = new Date(new Date(ev.ends_at).getTime() + 15 * 60 * 1000).toISOString();
    await quickUpdateEvent(ev.id, { starts_at: ns, ends_at: ne, status: 'delayed' });
  }

  async function postNotice(e: React.FormEvent) {
    e.preventDefault();
    if (!noticeText.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('announcements').insert({
      message: noticeText.trim(),
      priority: noticePriority,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setNoticeText('');
      toast.success('Announcement published!');
      await refresh();
    }
  }

  async function postResult(e: React.FormEvent) {
    e.preventDefault();
    const evId = resultEventId || feed.events[0]?.id;
    if (!evId || !resultBody.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('results').insert({
      event_id: evId,
      title: resultTitle.trim() || 'Results',
      body: resultBody.trim(),
      is_live: false,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setResultBody('');
      toast.success('Results published!');
    }
  }

  async function deleteUpdateItem(kind: 'notice' | 'change', id: string) {
    setBusy(true);
    const supabase = createClient();
    const table = kind === 'change' ? 'event_changes' : 'announcements';
    const { error } = await supabase.from(table).delete().eq('id', id);
    setBusy(false);
    if (error) toast.error(error.message || 'Could not delete update.');
    else {
      toast.success(kind === 'change' ? 'Change log deleted.' : 'Notice deleted.');
      await refresh();
    }
  }

  async function clearAllChangeLogs() {
    if (feed.changes.length === 0) return;
    setBusy(true);
    const supabase = createClient();
    const ids = feed.changes.map((c) => c.id);
    const { error } = await supabase.from('event_changes').delete().in('id', ids);
    setBusy(false);
    if (error) toast.error(error.message || 'Could not clear change logs.');
    else {
      toast.success('All schedule change logs cleared.');
      await refresh();
    }
  }

  const allUpdates = [
    ...feed.notices.map((n) => ({
      id: n.id,
      kind: 'notice' as const,
      label: n.priority === 'urgent' ? 'URGENT NOTICE' : 'NOTICE',
      message: n.message,
      created_at: n.created_at,
    })),
    ...feed.changes.map((c) => ({
      id: c.id,
      kind: 'change' as const,
      label: 'SCHEDULE CHANGE',
      message: c.message,
      created_at: c.created_at,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Post Announcement */}
        <form
          onSubmit={postNotice}
          className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
        >
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Megaphone className="size-5 text-[#FFE14D]" />
            Post Notice
          </h2>
          <textarea
            rows={2}
            required
            maxLength={280}
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="e.g. Gate 2 open for evening performances"
            className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm text-[#F4F2FA]"
          />
          <div className="flex gap-2">
            <select
              value={noticePriority}
              onChange={(e) =>
                setNoticePriority(e.target.value as 'normal' | 'urgent')
              }
              className="h-10 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-bold text-[#F4F2FA]"
            >
              <option value="normal">Normal Notice</option>
              <option value="urgent">Urgent (Push + Yellow Banner)</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="h-10 flex-1 rounded-xl bg-[#FFD60A] text-xs font-extrabold text-[#12091E] cursor-pointer"
            >
              Publish
            </button>
          </div>
        </form>

        {/* Publish Result */}
        <form
          onSubmit={postResult}
          className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
        >
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Trophy className="size-5 text-[#FFD60A]" />
            Publish Winners / Results
          </h2>
          <select
            value={resultEventId || feed.events[0]?.id || ''}
            onChange={(e) => setResultEventId(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
          >
            {feed.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={resultTitle}
            onChange={(e) => setResultTitle(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
          />
          <textarea
            rows={2}
            required
            value={resultBody}
            onChange={(e) => setResultBody(e.target.value)}
            placeholder="1st: Team A&#10;2nd: Team B"
            className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-xs text-[#F4F2FA]"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-10 w-full rounded-xl bg-[#FFD60A] text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Publish Result
          </button>
        </form>
      </div>

      {/* Manage & Delete Published Updates / Logs */}
      <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
              Updates &amp; Change Logs ({allUpdates.length})
            </h2>
            <p className="text-xs text-[#9C97B0]">
              Delete old notices or automatic schedule change logs immediately.
            </p>
          </div>
          {feed.changes.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearAllChangeLogs()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#FF4F5E]/50 bg-[#FF4F5E]/15 px-3 text-xs font-extrabold text-[#FF4F5E] hover:bg-[#FF4F5E]/25 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Clear all change logs ({feed.changes.length})
            </button>
          )}
        </div>

        {allUpdates.length === 0 ? (
          <p className="text-xs italic text-[#9C97B0]">
            No notices or schedule change logs right now.
          </p>
        ) : (
          <div className="space-y-2">
            {allUpdates.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider">
                    <span
                      className={
                        item.kind === 'change'
                          ? 'text-[#22D3EE]'
                          : 'text-[#FFE14D]'
                      }
                    >
                      {item.label}
                    </span>
                    <span className="text-[#9C97B0]">
                      · {formatTimeAgo(item.created_at, feed.server_time)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#F4F2FA] break-words">
                    {item.message}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteUpdateItem(item.kind, item.id)}
                  aria-label="Delete update log"
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#FF4F5E]/40 bg-[#FF4F5E]/15 px-2.5 text-[11px] font-extrabold text-[#FF4F5E] hover:bg-[#FF4F5E]/25 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick 2-Tap Event Controls */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
          All {feed.events.length} Events (2-Tap Controls)
        </h2>
        <div className="grid gap-2.5 md:grid-cols-2">
          {feed.events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-base font-extrabold text-[#F4F2FA]">
                    {ev.title}
                  </p>
                  <p className="text-xs text-[#9C97B0]">
                    {formatDay(ev.starts_at)} ·{' '}
                    {formatRange(ev.starts_at, ev.ends_at)} ·{' '}
                    {ev.venue_name || 'TBA'}
                  </p>
                </div>
                <span className="rounded-full bg-[#2A1840] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#FFD60A]">
                  {ev.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void delay15(ev)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#FFE14D] px-2.5 text-[11px] font-extrabold text-[#12091E] cursor-pointer"
                >
                  <Clock className="size-3" />
                  +15 min
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void quickUpdateEvent(ev.id, { status: 'done' })}
                  className="h-8 rounded-lg border border-[#3B2758] px-2.5 text-[11px] font-bold text-[#F4F2FA] cursor-pointer"
                >
                  Mark Done
                </button>
                <Link
                  href={`/host/event/?id=${ev.id}`}
                  className="inline-flex h-8 items-center rounded-lg border border-[#FFD60A]/50 px-2.5 text-[11px] font-bold text-[#FFD60A]"
                >
                  Full Edit
                </Link>
                <Link
                  href={`/host/voting/?id=${ev.id}`}
                  className="inline-flex h-8 items-center rounded-lg border border-[#FF4FD8]/50 px-2.5 text-[11px] font-bold text-[#FF4FD8]"
                >
                  Voting
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
