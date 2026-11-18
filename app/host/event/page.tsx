'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, Loader2, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';
import type { EventStatus } from '@/lib/types';

function toIstInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
}

function fromIstInput(localStr: string): string | null {
  if (!localStr) return null;
  return `${localStr}:00+05:30`;
}

function HostEventInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { loading: authLoading } = useAuth();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [venueId, setVenueId] = useState('');
  const [status, setStatus] = useState<EventStatus>('scheduled');
  const [description, setDescription] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [regOpensAt, setRegOpensAt] = useState('');
  const [regClosesAt, setRegClosesAt] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading || !id) return;
    let active = true;
    const supabase = createClient();
    Promise.all([
      supabase.rpc('is_event_host', { p_event: id }),
      supabase.from('events').select('*').eq('id', id).maybeSingle(),
      supabase.from('venues').select('id, name').order('name'),
    ]).then(([hostRes, evRes, vRes]) => {
      if (!active) return;
      setAllowed(Boolean(hostRes.data));
      setVenues((vRes.data ?? []) as Array<{ id: string; name: string }>);
      if (evRes.data) {
        const ev = evRes.data;
        setTitle(ev.title || '');
        setStartsAt(toIstInput(ev.starts_at));
        setEndsAt(toIstInput(ev.ends_at));
        setVenueId(ev.venue_id ?? '');
        setStatus((ev.status as EventStatus) || 'scheduled');
        setDescription(ev.description ?? '');
        setRegistrationUrl(ev.registration_url ?? '');
        setRegOpensAt(toIstInput(ev.registration_opens_at));
        setRegClosesAt(toIstInput(ev.registration_closes_at));
        setContactInfo(ev.contact_info ?? '');
        setCoordinator(ev.host_coordinator ?? '');
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, id]);

  async function save(override?: {
    starts_at?: string;
    ends_at?: string;
    status?: EventStatus;
  }) {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('host_update_event', {
      p_event: id,
      p_starts_at: override?.starts_at ?? fromIstInput(startsAt),
      p_ends_at: override?.ends_at ?? fromIstInput(endsAt),
      p_venue_id: venueId || null,
      p_status: override?.status ?? status,
      p_description: description,
      p_registration_url: registrationUrl.trim(),
      p_registration_opens_at: fromIstInput(regOpensAt),
      p_registration_closes_at: fromIstInput(regClosesAt),
      p_contact_info: contactInfo.trim() || null,
      p_cover_url: null,
      p_host_coordinator: coordinator.trim() || null,
    });
    setBusy(false);
    const res = data as { ok?: boolean; message?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.message || error?.message || 'Save failed.');
    } else {
      toast.success('Event updated! Students are alerted automatically.');
    }
  }

  async function delay15Min() {
    const sMs = new Date(`${startsAt}:00+05:30`).getTime();
    const eMs = new Date(`${endsAt}:00+05:30`).getTime();
    if (Number.isNaN(sMs) || Number.isNaN(eMs)) return;
    const ns = new Date(sMs + 15 * 60 * 1000).toISOString();
    const ne = new Date(eMs + 15 * 60 * 1000).toISOString();
    setStartsAt(toIstInput(ns));
    setEndsAt(toIstInput(ne));
    setStatus('delayed');
    await save({ starts_at: ns, ends_at: ne, status: 'delayed' });
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
        <p className="text-sm text-[#9C97B0]">
          You are not a host for this event.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/host/"
          className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#FF4FD8]">
            HOST EVENT EDITOR
          </p>
          <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#FFE14D]/50 bg-[#1F1230] p-4">
        <div className="text-xs">
          <p className="font-extrabold text-[#FFE14D]">Running late?</p>
          <p className="text-[#BDB8CF]">
            Shift start &amp; end by +15 min and alert students.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void delay15Min()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFE14D] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
        >
          <Clock className="size-4" />
          Delay +15 min
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Starts (IST)
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Ends (IST)
            <input
              type="datetime-local"
              required
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Venue
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            >
              <option value="">Select venue…</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            >
              <option value="scheduled">Scheduled</option>
              <option value="delayed">Delayed</option>
              <option value="cancelled">Cancelled</option>
              <option value="done">Done</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-xs font-bold text-[#BDB8CF]">
          Registration Form Link
          <input
            type="url"
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Registration Opens (IST)
            <input
              type="datetime-local"
              value={regOpensAt}
              onChange={(e) => setRegOpensAt(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Registration Closes (IST)
            <input
              type="datetime-local"
              value={regClosesAt}
              onChange={(e) => setRegClosesAt(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Coordinator Name
            <input
              type="text"
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Contact Info
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs font-bold text-[#BDB8CF]">
          Description / Rules
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm text-[#F4F2FA]"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
        >
          <Save className="size-4" />
          {busy ? 'Saving…' : 'Save event changes'}
        </button>
      </form>
    </div>
  );
}

export default function HostEventPage() {
  return (
    <Suspense fallback={null}>
      <HostEventInner />
    </Suspense>
  );
}
