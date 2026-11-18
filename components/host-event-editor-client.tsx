'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { hostUpdateEventAction } from '@/app/host/events/[id]/actions';
import type { EventStatus } from '@/lib/types';

export interface HostEditableEvent {
  id: string;
  code: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  venue_id: string | null;
  status: EventStatus;
  description: string | null;
  registration_url: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  contact_info: string | null;
  host_coordinator?: string | null;
}

function toIstInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Convert to IST (+05:30) for datetime-local input
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
}

function fromIstInput(localStr: string): string | null {
  if (!localStr) return null;
  return `${localStr}:00+05:30`;
}

export function HostEventEditorClient({
  event,
  venues,
}: {
  event: HostEditableEvent;
  venues: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [startsAt, setStartsAt] = useState(toIstInput(event.starts_at));
  const [endsAt, setEndsAt] = useState(toIstInput(event.ends_at));
  const [venueId, setVenueId] = useState(event.venue_id ?? '');
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [description, setDescription] = useState(event.description ?? '');
  const [registrationUrl, setRegistrationUrl] = useState(
    event.registration_url ?? ''
  );
  const [regOpensAt, setRegOpensAt] = useState(
    toIstInput(event.registration_opens_at)
  );
  const [regClosesAt, setRegClosesAt] = useState(
    toIstInput(event.registration_closes_at)
  );
  const [contactInfo, setContactInfo] = useState(event.contact_info ?? '');
  const [coordinator, setCoordinator] = useState(event.host_coordinator ?? '');

  function delayBy15Min() {
    const startMs = new Date(`${startsAt}:00+05:30`).getTime();
    const endMs = new Date(`${endsAt}:00+05:30`).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return;
    const nextStart = new Date(startMs + 15 * 60 * 1000).toISOString();
    const nextEnd = new Date(endMs + 15 * 60 * 1000).toISOString();

    startTransition(async () => {
      const res = await hostUpdateEventAction({
        eventId: event.id,
        starts_at: nextStart,
        ends_at: nextEnd,
        status: 'delayed',
      });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        setStartsAt(toIstInput(nextStart));
        setEndsAt(toIstInput(nextEnd));
        setStatus('delayed');
        toast.success('Event delayed by 15 min — students will be alerted!');
      }
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await hostUpdateEventAction({
        eventId: event.id,
        starts_at: fromIstInput(startsAt) ?? undefined,
        ends_at: fromIstInput(endsAt) ?? undefined,
        venue_id: venueId || null,
        status,
        description,
        registration_url: registrationUrl.trim(),
        registration_opens_at: fromIstInput(regOpensAt),
        registration_closes_at: fromIstInput(regClosesAt),
        contact_info: contactInfo.trim() || null,
        host_coordinator: coordinator.trim() || null,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success('Event updated! Any time/venue/status changes alert students automatically.');
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/host"
            aria-label="Back to hosted events"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF4FD8]">
              HOST EVENT EDITOR {event.code ? `· ${event.code}` : ''}
            </p>
            <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
              {event.title}
            </h1>
          </div>
        </div>

        <Link
          href={`/host/events/${event.id}/participants`}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#FFD60A]/60 bg-[#1F1230] px-3.5 text-xs font-extrabold text-[#FFD60A]"
        >
          <Users className="size-4" />
          Participants &amp; Line-up
        </Link>
      </div>

      {/* Quick 1-Tap Delay */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#FFE14D]/50 bg-[#1F1230] p-4">
        <div className="text-xs">
          <p className="font-extrabold text-[#FFE14D]">Running late?</p>
          <p className="text-[#BDB8CF]">
            Shift start &amp; end by 15 minutes and notify students immediately.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={delayBy15Min}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFE14D] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer disabled:opacity-50"
        >
          <Clock className="size-4" />
          Delay +15 min
        </button>
      </div>

      <form
        onSubmit={handleSave}
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
          Registration Form Link (https://forms.gle/… or linktr.ee)
          <input
            type="url"
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
            placeholder="https://forms.gle/..."
            className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Registration Opens (IST, optional)
            <input
              type="datetime-local"
              value={regOpensAt}
              onChange={(e) => setRegOpensAt(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA]"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Registration Closes (IST, optional)
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
            Coordinator Name (optional)
            <input
              type="text"
              maxLength={80}
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-[#BDB8CF]">
            Public Contact Info (optional)
            <input
              type="text"
              maxLength={200}
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
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm text-[#F4F2FA]"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] disabled:opacity-50 cursor-pointer"
        >
          <Save className="size-4" />
          {isPending ? 'Saving…' : 'Save event changes'}
        </button>
      </form>
    </div>
  );
}
