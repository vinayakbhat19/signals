'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Printer, RotateCw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import {
  rotateStampCodeAction,
  saveHuntPlaceAction,
  saveHuntSettingsAction,
  toggleHuntPlaceActiveAction,
} from '@/app/admin/hunt/actions';
import type { StampMascot } from '@/lib/types';

export interface AdminHuntPlace {
  id: string;
  name: string;
  clue: string;
  hint: string | null;
  found_text: string | null;
  mascot: StampMascot;
  sort: number;
  active: boolean;
}

export interface AdminHuntConfig {
  name: string;
  opens_at: string;
  closes_at: string;
  stamp_value: number;
  complete_bonus: number;
  min_gap_seconds: number;
  sequential: boolean;
}

export function AdminHuntClient({
  config,
  places,
}: {
  config: AdminHuntConfig;
  places: AdminHuntPlace[];
}) {
  const [isPending, startTransition] = useTransition();
  const [huntName, setHuntName] = useState(config.name);
  const [opensAt, setOpensAt] = useState(config.opens_at.slice(0, 16));
  const [closesAt, setClosesAt] = useState(config.closes_at.slice(0, 16));
  const [stampValue, setStampValue] = useState(config.stamp_value);
  const [completeBonus, setCompleteBonus] = useState(config.complete_bonus);
  const [minGap, setMinGap] = useState(config.min_gap_seconds);
  const [sequential, setSequential] = useState(config.sequential);

  const [newName, setNewName] = useState('');
  const [newClue, setNewClue] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newFoundText, setNewFoundText] = useState('');
  const [newMascot, setNewMascot] = useState<StampMascot>('spark');

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveHuntSettingsAction({
        name: huntName,
        opens_at: new Date(opensAt).toISOString(),
        closes_at: new Date(closesAt).toISOString(),
        stamp_value: Number(stampValue),
        complete_bonus: Number(completeBonus),
        min_gap_seconds: Number(minGap),
        sequential,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success('Treasure Hunt settings saved.');
    });
  }

  function handleAddPlace(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveHuntPlaceAction({
        name: newName,
        clue: newClue,
        hint: newHint || null,
        found_text: newFoundText || null,
        mascot: newMascot,
        sort: places.length + 1,
        active: true,
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success('Hidden place added! Go to Hunt Stickers to print its QR.');
        setNewName('');
        setNewClue('');
        setNewHint('');
        setNewFoundText('');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[#F4F2FA]">TREASURE HUNT</h1>
          <p className="text-xs text-[#9C97B0]">
            Manage hidden campus places, clues, hints, and static QR stickers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/hunt/qr"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
          >
            <Printer className="size-4" />
            Print Hunt Stickers
          </Link>
          <Link
            href="/admin/hunt/winners"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FFE14D]/60 bg-[#1F1230] px-4 text-xs font-extrabold text-[#FFE14D]"
          >
            <Trophy className="size-4" />
            Prize Desk Winners
          </Link>
        </div>
      </div>

      {/* Hunt Settings */}
      <form
        onSubmit={handleSaveConfig}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-4"
      >
        <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
          Hunt Settings
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={huntName}
            onChange={(e) => setHuntName(e.target.value)}
            placeholder="Hunt title"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <input
            type="datetime-local"
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
          />
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-4 items-center">
          <label className="text-xs text-[#BDB8CF]">
            Pts / place
            <input
              type="number"
              value={stampValue}
              onChange={(e) => setStampValue(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
          <label className="text-xs text-[#BDB8CF]">
            All-found bonus
            <input
              type="number"
              value={completeBonus}
              onChange={(e) => setCompleteBonus(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
          <label className="text-xs text-[#BDB8CF]">
            Min gap (sec)
            <input
              type="number"
              value={minGap}
              onChange={(e) => setMinGap(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
          <label className="flex items-center gap-2 pt-4 text-xs font-bold text-[#F4F2FA] cursor-pointer">
            <input
              type="checkbox"
              checked={sequential}
              onChange={(e) => setSequential(e.target.checked)}
              className="size-4 accent-[#FFD60A]"
            />
            One clue at a time
          </label>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-xl bg-[#FFD60A] px-5 text-xs font-extrabold text-[#12091E] cursor-pointer"
        >
          Save settings
        </button>
      </form>

      {/* Add Place */}
      <form
        onSubmit={handleAddPlace}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <Plus className="size-5 text-[#FFD60A]" />
          Add Hidden Campus Place
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Hidden place name (e.g. Library Steps)"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <select
            value={newMascot}
            onChange={(e) => setNewMascot(e.target.value as StampMascot)}
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          >
            {(['spark', 'zap', 'beat', 'kick', 'doodle', 'buzz'] as const).map(
              (m) => (
                <option key={m} value={m}>
                  Mascot: {m}
                </option>
              )
            )}
          </select>
          <input
            type="text"
            required
            value={newClue}
            onChange={(e) => setNewClue(e.target.value)}
            placeholder="Riddle clue shown to players"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <input
            type="text"
            value={newHint}
            onChange={(e) => setNewHint(e.target.value)}
            placeholder="Optional extra hint (revealed on tap)"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newFoundText}
            onChange={(e) => setNewFoundText(e.target.value)}
            placeholder="Fun message shown after scanning (optional)"
            className="h-11 flex-1 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="h-11 rounded-xl bg-[#FFD60A] px-5 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Add Place
          </button>
        </div>
      </form>

      {/* Existing Places */}
      <div className="grid gap-3 md:grid-cols-2">
        {places.map((p) => (
          <div
            key={p.id}
            className="rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="font-heading text-base font-extrabold text-[#FFD60A]">
                #{p.sort} · {p.name}
              </strong>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  p.active
                    ? 'bg-[#FFD60A]/20 text-[#FFD60A]'
                    : 'bg-[#3B2758] text-[#9C97B0]'
                }`}
              >
                {p.active ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-[#F4F2FA]">Clue: &ldquo;{p.clue}&rdquo;</p>
            {p.hint && (
              <p className="text-[11px] text-[#22D3EE]">Hint: {p.hint}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await toggleHuntPlaceActiveAction(p.id, !p.active);
                    if (!r.ok) toast.error(r.error);
                    else toast.success(p.active ? 'Place paused' : 'Place enabled');
                  })
                }
                className="rounded-lg border border-[#3B2758] px-2.5 py-1 text-[11px] font-bold text-[#F4F2FA] cursor-pointer"
              >
                {p.active ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await rotateStampCodeAction(p.id);
                    if (!r.ok) toast.error(r.error);
                    else toast.success('Sticker code rotated! Reprint this sticker.');
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[#FF4F5E]/50 px-2.5 py-1 text-[11px] font-bold text-[#FF9EA7] cursor-pointer"
              >
                <RotateCw className="size-3" />
                Rotate code
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
