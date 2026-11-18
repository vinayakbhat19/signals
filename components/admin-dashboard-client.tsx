'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Megaphone,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createAnnouncementAction,
  createResultAction,
  createVenueAction,
  deleteAnnouncementAction,
  deleteEventAction,
  deleteResultAction,
  deleteVenueAction,
  quickDelayEventAction,
  saveEventAction,
  setEventStatusAction,
} from '@/app/admin/actions';
import { CategoryChip } from '@/components/category-chip';
import { StatusBadge } from '@/components/status-badge';
import type { AnnouncementWithEvent } from '@/lib/data/announcements';
import type { EventWithVenue } from '@/lib/data/events';
import type { ResultWithEvent } from '@/lib/data/results';
import { formatDay, formatRange, formatTimeAgo } from '@/lib/time';
import {
  EVENT_CATEGORIES,
  type AnnouncementPriority,
  type EventCategory,
  type Venue,
} from '@/lib/types';
import { cn } from '@/lib/utils';

type PanelTab = 'events' | 'venues' | 'notices' | 'results';

interface AdminDashboardClientProps {
  events: EventWithVenue[];
  venues: Venue[];
  announcements: AnnouncementWithEvent[];
  results: ResultWithEvent[];
}

export function AdminDashboardClient({
  events,
  venues,
  announcements,
  results,
}: AdminDashboardClientProps) {
  const [tab, setTab] = useState<PanelTab>('events');
  const [search, setSearch] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [isPending, startTransition] = useTransition();

  // New event form state
  const [evTitle, setEvTitle] = useState('');
  const [evCategory, setEvCategory] = useState<EventCategory>('cultural');
  const [evVenueId, setEvVenueId] = useState('');
  const [evDate, setEvDate] = useState('2026-11-25');
  const [evStart, setEvStart] = useState('17:00');
  const [evEnd, setEvEnd] = useState('18:30');
  const [evRegUrl, setEvRegUrl] = useState('https://linktr.ee/sdmcetFiesta26');
  const [evHost, setEvHost] = useState('');
  const [evDesc, setEvDesc] = useState('');

  // New venue state
  const [vName, setVName] = useState('');
  const [vDesc, setVDesc] = useState('');
  const [vMaps, setVMaps] = useState('');

  // New notice state
  const [nMsg, setNMsg] = useState('');
  const [nPriority, setNPriority] = useState<AnnouncementPriority>('normal');
  const [nEventId, setNEventId] = useState('');

  // New result state
  const [rEventId, setREventId] = useState(events[0]?.id ?? '');
  const [rTitle, setRTitle] = useState('Winners');
  const [rBody, setRBody] = useState('');
  const [rLive, setRLive] = useState(false);

  const filteredEvents = events.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      (e.venue_name ?? '').toLowerCase().includes(q) ||
      (e.code ?? '').toLowerCase().includes(q)
    );
  });

  function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveEventAction({
        title: evTitle,
        category: evCategory,
        venue_id: evVenueId || null,
        date: evDate,
        start: evStart,
        end: evEnd,
        status: 'scheduled',
        registration_url: evRegUrl || null,
        host_name: evHost || null,
        description: evDesc || null,
        is_published: true,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Event created and published!');
      setEvTitle('');
      setEvDesc('');
      setShowNewEvent(false);
    });
  }

  function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createVenueAction({
        name: vName,
        description: vDesc || null,
        maps_url: vMaps || null,
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success('Venue added');
        setVName('');
        setVDesc('');
        setVMaps('');
      }
    });
  }

  function handleCreateNotice(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAnnouncementAction({
        message: nMsg,
        priority: nPriority,
        event_id: nEventId || null,
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success('Notice published! Visible to students within seconds.');
        setNMsg('');
      }
    });
  }

  function handleCreateResult(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createResultAction({
        event_id: rEventId,
        title: rTitle,
        body: rBody,
        is_live: rLive,
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success('Result published!');
        setRBody('');
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="grid grid-cols-4 gap-1 rounded-[16px] border border-[#3B2758] bg-[#1F1230] p-1">
        {(
          [
            { id: 'events', label: `Events (${events.length})` },
            { id: 'venues', label: `Venues (${venues.length})` },
            { id: 'notices', label: `Notices (${announcements.length})` },
            { id: 'results', label: `Results (${results.length})` },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'h-10 rounded-[11px] text-xs font-extrabold transition-colors cursor-pointer',
              tab === item.id
                ? 'bg-[#FFD60A] text-[#12091E]'
                : 'text-[#BDB8CF] hover:text-[#F4F2FA]'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* EVENTS TAB */}
      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, codes, venues…"
              className="h-11 min-w-[200px] flex-1 rounded-[14px] border border-[#3B2758] bg-[#1F1230] px-3.5 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
            <button
              type="button"
              onClick={() => setShowNewEvent((v) => !v)}
              className="inline-flex h-11 items-center gap-1.5 rounded-[14px] bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
            >
              <Plus className="size-4" />
              New Event
            </button>
          </div>

          {showNewEvent && (
            <form
              onSubmit={handleCreateEvent}
              className="space-y-3 rounded-[20px] border-2 border-[#FFD60A] bg-[#1F1230] p-4"
            >
              <h2 className="font-heading text-lg font-extrabold text-[#FFD60A]">
                Create Event
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Event title *"
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                />
                <select
                  value={evCategory}
                  onChange={(e) => setEvCategory(e.target.value as EventCategory)}
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={evVenueId}
                  onChange={(e) => setEvVenueId(e.target.value)}
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                >
                  <option value="">Venue (TBA)</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                />
                <input
                  type="time"
                  required
                  value={evStart}
                  onChange={(e) => setEvStart(e.target.value)}
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                />
                <input
                  type="time"
                  required
                  value={evEnd}
                  onChange={(e) => setEvEnd(e.target.value)}
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                />
                <input
                  value={evRegUrl}
                  onChange={(e) => setEvRegUrl(e.target.value)}
                  placeholder="Registration URL (Google Form / Linktree)"
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                />
                <input
                  value={evHost}
                  onChange={(e) => setEvHost(e.target.value)}
                  placeholder="Host club / committee"
                  className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
                />
              </div>
              <textarea
                rows={2}
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-11 rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] cursor-pointer"
                >
                  Save &amp; Publish
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewEvent(false)}
                  className="h-11 rounded-xl border border-[#3B2758] px-4 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="space-y-3 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ev.code && (
                        <span className="rounded bg-[#12091E] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#FFD60A]">
                          {ev.code}
                        </span>
                      )}
                      <CategoryChip category={ev.category} />
                      <StatusBadge status={ev.status} />
                    </div>
                    <h3 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-[#BDB8CF]">
                      {formatDay(ev.starts_at)} ·{' '}
                      {formatRange(ev.starts_at, ev.ends_at)} ·{' '}
                      {ev.venue_name ?? 'Venue TBA'}
                    </p>
                  </div>

                  <Link
                    href={`/host/events/${ev.id}/participants`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-bold text-[#22D3EE]"
                  >
                    <Users className="size-3.5" /> Participants
                  </Link>
                </div>

                {/* 1-tap phone-friendly Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await quickDelayEventAction(ev.id, 15);
                        if (!r.ok) toast.error(r.error);
                        else toast.success(`${ev.title} delayed +15 min`);
                      })
                    }
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FF9F43] px-3 text-xs font-extrabold text-[#12091E] cursor-pointer"
                  >
                    <Clock className="size-3.5" /> +15 min
                  </button>

                  {ev.status !== 'done' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await setEventStatusAction(ev.id, 'done');
                          if (!r.ok) toast.error(r.error);
                          else toast.success(`${ev.title} marked done`);
                        })
                      }
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-bold text-[#F4F2FA] cursor-pointer"
                    >
                      <CheckCircle2 className="size-3.5 text-[#FFD60A]" /> Mark
                      done
                    </button>
                  )}

                  {ev.status !== 'cancelled' ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await setEventStatusAction(
                            ev.id,
                            'cancelled'
                          );
                          if (!r.ok) toast.error(r.error);
                          else toast.success(`${ev.title} cancelled`);
                        })
                      }
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FF4F5E]/50 bg-[#FF4F5E]/15 px-3 text-xs font-bold text-[#FF7D88] cursor-pointer"
                    >
                      <XCircle className="size-3.5" /> Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await setEventStatusAction(
                            ev.id,
                            'scheduled'
                          );
                          if (!r.ok) toast.error(r.error);
                          else toast.success(`${ev.title} restored`);
                        })
                      }
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3 text-xs font-extrabold text-[#12091E] cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" /> Restore
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete "${ev.title}"?`)) return;
                      startTransition(async () => {
                        const r = await deleteEventAction(ev.id);
                        if (!r.ok) toast.error(r.error);
                        else toast.success('Event deleted');
                      });
                    }}
                    className="ml-auto inline-flex size-10 items-center justify-center rounded-xl border border-[#3B2758] text-[#9C97B0] hover:text-[#FF4F5E] cursor-pointer"
                    aria-label={`Delete ${ev.title}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VENUES TAB */}
      {tab === 'venues' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateVenue}
            className="grid gap-2.5 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4 sm:grid-cols-3"
          >
            <input
              required
              value={vName}
              onChange={(e) => setVName(e.target.value)}
              placeholder="Venue name *"
              className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
            />
            <input
              value={vDesc}
              onChange={(e) => setVDesc(e.target.value)}
              placeholder="Building / floor"
              className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
            />
            <input
              value={vMaps}
              onChange={(e) => setVMaps(e.target.value)}
              placeholder="Google Maps link (optional)"
              className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="h-11 rounded-xl bg-[#FFD60A] px-4 text-sm font-extrabold text-[#12091E] sm:col-span-3 cursor-pointer"
            >
              Add Venue
            </button>
          </form>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {venues.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold">
                    <MapPin className="size-4 text-[#FFD60A]" />
                    <span className="truncate">{v.name}</span>
                  </div>
                  {v.description && (
                    <p className="truncate text-xs text-[#9C97B0]">
                      {v.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Delete venue "${v.name}"?`)) return;
                    startTransition(async () => {
                      const r = await deleteVenueAction(v.id);
                      if (!r.ok) toast.error(r.error);
                      else toast.success('Venue deleted');
                    });
                  }}
                  className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] text-[#9C97B0] hover:text-[#FF4F5E] cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTICES TAB */}
      {tab === 'notices' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateNotice}
            className="space-y-3 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#FFD60A]">
                <Megaphone className="size-4" /> Post Announcement
              </span>
              <span className="text-xs text-[#9C97B0]">{nMsg.length}/280</span>
            </div>
            <textarea
              required
              maxLength={280}
              rows={3}
              value={nMsg}
              onChange={(e) => setNMsg(e.target.value)}
              placeholder="E.g. StreetPlay starts in 15 mins at Admin Block!"
              className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm text-[#F4F2FA]"
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <select
                value={nPriority}
                onChange={(e) =>
                  setNPriority(e.target.value as AnnouncementPriority)
                }
                className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
              >
                <option value="normal">Normal notice</option>
                <option value="urgent">Urgent (pinned banner on Home)</option>
              </select>
              <select
                value={nEventId}
                onChange={(e) => setNEventId(e.target.value)}
                className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
              >
                <option value="">No linked event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-xl bg-[#FFD60A] text-sm font-extrabold text-[#12091E] cursor-pointer"
            >
              Publish Notice
            </button>
          </form>

          <div className="space-y-2.5">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-extrabold uppercase',
                        a.priority === 'urgent'
                          ? 'bg-[#FF4F5E] text-[#12091E]'
                          : 'bg-[#3B2758] text-[#CFCBDD]'
                      )}
                    >
                      {a.priority}
                    </span>
                    <span className="text-[#9C97B0]">
                      {formatTimeAgo(a.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-[#F4F2FA]">{a.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await deleteAnnouncementAction(a.id);
                      if (!r.ok) toast.error(r.error);
                      else toast.success('Notice deleted');
                    })
                  }
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#3B2758] text-[#9C97B0] hover:text-[#FF4F5E] cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS TAB */}
      {tab === 'results' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateResult}
            className="space-y-3 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4"
          >
            <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#FFD60A]">
              <Trophy className="size-4" /> Publish Result / Live Score
            </span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <select
                required
                value={rEventId}
                onChange={(e) => setREventId(e.target.value)}
                className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
              >
                <option value="">Select event *</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <input
                required
                value={rTitle}
                onChange={(e) => setRTitle(e.target.value)}
                placeholder="Heading (e.g. Winners / Live Score)"
                className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
              />
            </div>
            <textarea
              required
              rows={3}
              value={rBody}
              onChange={(e) => setRBody(e.target.value)}
              placeholder={"1st Place: ...\n2nd Place: ...\n3rd Place: ..."}
              className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm"
            />
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={rLive}
                onChange={(e) => setRLive(e.target.checked)}
                className="size-4 accent-[#FF4FD8]"
              />
              Mark as LIVE ongoing score
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-xl bg-[#FFD60A] text-sm font-extrabold text-[#12091E] cursor-pointer"
            >
              Save Result
            </button>
          </form>

          <div className="space-y-2.5">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-[#FFD60A]">
                      {r.event_title}
                    </strong>
                    <span className="text-xs text-[#BDB8CF]">— {r.title}</span>
                    {r.is_live && (
                      <span className="rounded-full bg-[#FF4FD8] px-2 py-0.5 text-[10px] font-extrabold text-[#12091E]">
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-sm text-[#F4F2FA]">
                    {r.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteResultAction(r.id);
                      if (!res.ok) toast.error(res.error);
                      else toast.success('Result deleted');
                    })
                  }
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#3B2758] text-[#9C97B0] hover:text-[#FF4F5E] cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
