'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, MonitorPlay, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addContestantAction,
  deleteContestantAction,
  upsertPollAction,
} from '@/app/admin/actions';
import type { EventWithVenue } from '@/lib/data/events';
import type { PollWithEvent } from '@/lib/data/voting';
import type { Contestant, ResultsVisibility } from '@/lib/types';

interface AdminVotingClientProps {
  events: EventWithVenue[];
  polls: PollWithEvent[];
  contestantsByPoll: Record<string, Contestant[]>;
}

export function AdminVotingClient({
  events,
  polls,
  contestantsByPoll,
}: AdminVotingClientProps) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [newSub, setNewSub] = useState('');
  const [isPending, startTransition] = useTransition();

  const pollByEvent = new Map(polls.map((p) => [p.event_id, p]));
  const currentPoll = pollByEvent.get(selectedEventId) ?? null;
  const currentContestants = currentPoll
    ? (contestantsByPoll[currentPoll.id] ?? [])
    : [];

  function savePoll(overrides: Partial<{
    enabled: boolean;
    results_visibility: ResultsVisibility;
    college_only: boolean;
    require_code: boolean;
  }>) {
    if (!selectedEventId) return;
    startTransition(async () => {
      const res = await upsertPollAction({
        event_id: selectedEventId,
        title: currentPoll?.title ?? 'Audience vote',
        enabled: overrides.enabled ?? currentPoll?.enabled ?? true,
        results_visibility:
          overrides.results_visibility ??
          currentPoll?.results_visibility ??
          'live',
        college_only:
          overrides.college_only ?? currentPoll?.college_only ?? true,
        require_code:
          overrides.require_code ?? currentPoll?.require_code ?? false,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success('Voting settings saved');
    });
  }

  function handleAddContestant(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPoll || !newName.trim()) return;
    startTransition(async () => {
      const res = await addContestantAction({
        poll_id: currentPoll.id,
        event_id: selectedEventId,
        name: newName,
        subtitle: newSub || null,
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success('Contestant added');
        setNewName('');
        setNewSub('');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-[#9C97B0]">
          Select competition
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="h-12 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm font-bold text-[#F4F2FA]"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} {pollByEvent.get(ev.id)?.enabled ? '(LIVE)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <div className="space-y-4 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
              Poll Settings
            </h2>
            {currentPoll && (
              <div className="flex gap-2">
                <Link
                  href={`/vote/${selectedEventId}`}
                  target="_blank"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-bold text-[#FFD60A]"
                >
                  Student view <ExternalLink className="size-3.5" />
                </Link>
                <Link
                  href={`/screen/vote/${selectedEventId}`}
                  target="_blank"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FF4FD8] px-3 text-xs font-extrabold text-[#12091E]"
                >
                  <MonitorPlay className="size-3.5" /> Stage screen
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => savePoll({ enabled: !(currentPoll?.enabled ?? false) })}
              className={
                currentPoll?.enabled
                  ? 'h-12 rounded-xl bg-[#FFD60A] text-sm font-extrabold text-[#12091E] cursor-pointer'
                  : 'h-12 rounded-xl border-2 border-[#FFD60A] text-sm font-extrabold text-[#FFD60A] cursor-pointer'
              }
            >
              {currentPoll?.enabled
                ? 'Voting is ON (Tap to turn OFF)'
                : 'Enable Audience Voting'}
            </button>

            <select
              value={currentPoll?.results_visibility ?? 'live'}
              disabled={!currentPoll || isPending}
              onChange={(e) =>
                savePoll({
                  results_visibility: e.target.value as ResultsVisibility,
                })
              }
              className="h-12 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
            >
              <option value="live">Results: Live bars</option>
              <option value="after_close">Results: Only after close</option>
              <option value="hidden">Results: Hidden (organisers only)</option>
            </select>

            <label className="flex min-h-11 items-center justify-between rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 text-xs font-bold cursor-pointer">
              <span>Verified @sdmcet.ac.in only</span>
              <input
                type="checkbox"
                disabled={!currentPoll || isPending}
                checked={currentPoll?.college_only ?? true}
                onChange={(e) => savePoll({ college_only: e.target.checked })}
                className="size-5 accent-[#FFD60A]"
              />
            </label>

            <label className="flex min-h-11 items-center justify-between rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 text-xs font-bold cursor-pointer">
              <span>Require 30s stage screen code</span>
              <input
                type="checkbox"
                disabled={!currentPoll || isPending}
                checked={currentPoll?.require_code ?? false}
                onChange={(e) => savePoll({ require_code: e.target.checked })}
                className="size-5 accent-[#FF4FD8]"
              />
            </label>
          </div>
        </div>
      )}

      {/* Contestants manager */}
      {currentPoll && (
        <div className="space-y-3 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4">
          <h3 className="font-heading text-base font-extrabold text-[#F4F2FA]">
            Contestants ({currentContestants.length})
          </h3>

          <form
            onSubmit={handleAddContestant}
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contestant / team name *"
              className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
            />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Department / song / subtitle"
              className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
            >
              <Plus className="size-4" /> Add
            </button>
          </form>

          <div className="space-y-2">
            {currentContestants.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <div>
                  <span className="font-bold text-[#F4F2FA]">{c.name}</span>
                  {c.subtitle && (
                    <span className="ml-2 text-xs text-[#9C97B0]">
                      {c.subtitle}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await deleteContestantAction(
                        c.id,
                        selectedEventId
                      );
                      if (!r.ok) toast.error(r.error);
                      else toast.success('Removed');
                    })
                  }
                  className="text-[#9C97B0] hover:text-[#FF4F5E] cursor-pointer"
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
