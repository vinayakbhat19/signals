'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, ShieldAlert, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

interface ContestantRow {
  id: string;
  name: string;
  subtitle: string | null;
  sort: number;
  active: boolean;
}

function HostVotingInner() {
  const params = useSearchParams();
  const eventId = params.get('id') ?? '';
  const { loading: authLoading } = useAuth();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [visibility, setVisibility] = useState<'live' | 'after_close' | 'hidden'>('live');
  const [contestants, setContestants] = useState<ContestantRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newSub, setNewSub] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    const supabase = createClient();
    const [hostRes, evRes, pollRes] = await Promise.all([
      supabase.rpc('is_event_host', { p_event: eventId }),
      supabase.from('events').select('title').eq('id', eventId).maybeSingle(),
      supabase
        .from('polls')
        .select('id, enabled, title, results_visibility')
        .eq('event_id', eventId)
        .maybeSingle(),
    ]);
    setAllowed(Boolean(hostRes.data));
    setEventTitle(evRes.data?.title || 'Competition');
    if (pollRes.data) {
      setEnabled(Boolean(pollRes.data.enabled));
      setPollTitle(pollRes.data.title ?? '');
      setVisibility(
        (pollRes.data.results_visibility as 'live' | 'after_close' | 'hidden') ||
          'live'
      );
      const { data: cRows } = await supabase
        .from('contestants')
        .select('id, name, subtitle, sort, active')
        .eq('poll_id', pollRes.data.id)
        .order('sort', { ascending: true });
      setContestants((cRows ?? []) as ContestantRow[]);
    }
  }, [eventId]);

  useEffect(() => {
    if (authLoading) return;
    const raf = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(raf);
  }, [authLoading, load]);

  async function saveVotingSettings(nextEnabled: boolean) {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('host_set_voting', {
      p_event: eventId,
      p_enabled: nextEnabled,
      p_title: pollTitle.trim() || null,
      p_opens_at: null,
      p_closes_at: null,
      p_visibility: visibility,
      p_clear_times: false,
    });
    setBusy(false);
    const res = data as { ok?: boolean; message?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.message || error?.message || 'Could not update voting.');
    } else {
      setEnabled(nextEnabled);
      toast.success(
        nextEnabled
          ? 'Audience voting is now LIVE for your event!'
          : 'Audience voting turned OFF.'
      );
      await load();
    }
  }

  async function addContestant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('host_save_contestant', {
      p_event: eventId,
      p_id: null,
      p_name: newName.trim(),
      p_subtitle: newSub.trim() || null,
      p_photo_url: null,
      p_sort: contestants.length + 1,
      p_active: true,
    });
    setBusy(false);
    const res = data as { ok?: boolean; message?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.message || error?.message || 'Could not add team.');
    } else {
      setNewName('');
      setNewSub('');
      toast.success('Contestant added!');
      await load();
    }
  }

  if (authLoading || allowed === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">NOT ALLOWED</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/host/"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#FF4FD8]">
              HOST VOTING CONTROL
            </p>
            <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
              {eventTitle}
            </h1>
          </div>
        </div>
        <Link
          href={`/vote/?id=${eventId}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FFD60A]/60 px-3.5 text-xs font-bold text-[#FFD60A]"
        >
          <Vote className="size-4" />
          Open vote page
        </Link>
      </div>

      {/* Big On / Off Switch */}
      <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
              Audience Voting
            </h2>
            <p className="text-xs text-[#9C97B0]">
              Add contestants first, then switch voting ON when performances
              begin.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              enabled
                ? 'bg-[#FF4FD8] text-[#12091E]'
                : 'bg-[#3B2758] text-[#BDB8CF]'
            }`}
          >
            {enabled ? 'LIVE' : 'OFF'}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={pollTitle}
            onChange={(e) => setPollTitle(e.target.value)}
            placeholder="Poll title (optional)"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as 'live' | 'after_close' | 'hidden')
            }
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          >
            <option value="live">Show results: Live</option>
            <option value="after_close">Show results: After close</option>
            <option value="hidden">Show results: Hidden (stage reveal)</option>
          </select>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void saveVotingSettings(!enabled)}
          className={`flex h-12 w-full items-center justify-center rounded-[16px] text-sm font-extrabold cursor-pointer disabled:opacity-50 ${
            enabled
              ? 'bg-[#FF4F5E] text-white'
              : 'bg-[#FFD60A] text-[#12091E] shadow-[4px_4px_0_#FF4FD8]'
          }`}
        >
          {enabled ? 'Turn Voting OFF' : 'Turn Voting ON'}
        </button>
      </section>

      {/* Contestants */}
      <form
        onSubmit={addContestant}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
      >
        <h2 className="flex items-center gap-2 font-heading text-base font-extrabold text-[#F4F2FA]">
          <Plus className="size-4 text-[#FFD60A]" />
          Teams / Performers ({contestants.length})
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Team or performer name"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <input
            type="text"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Dept / tag (optional)"
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-[#FFD60A] text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            Add contestant
          </button>
        </div>

        {contestants.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {contestants.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-xs"
              >
                <span className="font-bold text-[#F4F2FA]">
                  #{idx + 1} · {c.name}
                  {c.subtitle && (
                    <span className="ml-1.5 font-normal text-[#9C97B0]">
                      ({c.subtitle})
                    </span>
                  )}
                </span>
                <span className="text-[#FFD60A]">
                  {c.active ? 'Active' : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

export default function HostVotingPage() {
  return (
    <Suspense fallback={null}>
      <HostVotingInner />
    </Suspense>
  );
}
