'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Printer, RotateCw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { StampMascot } from '@/lib/types';

interface PlaceRow {
  id: string;
  name: string;
  clue: string;
  hint: string | null;
  found_text: string | null;
  mascot: StampMascot;
  sort: number;
  active: boolean;
}

export default function AdminHuntPage() {
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [name, setName] = useState('');
  const [clue, setClue] = useState('');
  const [hint, setHint] = useState('');
  const [foundText, setFoundText] = useState('');
  const [mascot, setMascot] = useState<StampMascot>('spark');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('stamp_points')
      .select('id, name, clue, hint, found_text, mascot, sort, active')
      .order('sort', { ascending: true });
    setPlaces((data ?? []) as PlaceRow[]);
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(raf);
  }, [load]);

  async function addPlace(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clue.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('stamp_points').insert({
      name: name.trim(),
      clue: clue.trim(),
      hint: hint.trim() || null,
      found_text: foundText.trim() || null,
      mascot,
      sort: places.length + 1,
      active: true,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setName('');
      setClue('');
      setHint('');
      setFoundText('');
      toast.success('Hidden place added!');
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-[#F4F2FA]">
            TREASURE HUNT PLACES ({places.length})
          </h2>
          <p className="text-xs text-[#9C97B0]">
            Add hidden campus spots, edit clues, and print static stickers.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/stickers/"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
          >
            <Printer className="size-4" />
            Print Stickers
          </Link>
          <Link
            href="/staff/winners/"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FFE14D]/60 px-4 text-xs font-extrabold text-[#FFE14D]"
          >
            <Trophy className="size-4" />
            Winners Desk
          </Link>
        </div>
      </div>

      <form
        onSubmit={addPlace}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
      >
        <h3 className="flex items-center gap-2 font-heading text-base font-extrabold text-[#F4F2FA]">
          <Plus className="size-4 text-[#FFD60A]" />
          Add Hidden Spot
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hidden place name (e.g. Library Steps)"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <select
            value={mascot}
            onChange={(e) => setMascot(e.target.value as StampMascot)}
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
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            placeholder="Riddle clue"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Optional hint"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={foundText}
            onChange={(e) => setFoundText(e.target.value)}
            placeholder="Message shown when found (optional)"
            className="h-11 flex-1 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-[#FFD60A] px-5 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Add
          </button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {places.map((p) => (
          <div
            key={p.id}
            className="rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <strong className="text-[#FFD60A]">
                #{p.sort} · {p.name}
              </strong>
              <span className="text-[10px] font-extrabold uppercase text-[#BDB8CF]">
                {p.active ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-[#F4F2FA]">&ldquo;{p.clue}&rdquo;</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase
                    .from('stamp_points')
                    .update({ active: !p.active })
                    .eq('id', p.id);
                  await load();
                }}
                className="rounded-lg border border-[#3B2758] px-2.5 py-1 text-[11px] font-bold text-[#F4F2FA] cursor-pointer"
              >
                {p.active ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  const { error } = await supabase.rpc('rotate_stamp_code', {
                    p_point: p.id,
                  });
                  if (error) toast.error(error.message);
                  else toast.success('Code rotated! Reprint this sticker.');
                }}
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
