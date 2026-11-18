'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyState {
  configured: boolean;
  authenticated: boolean;
  overlay: {
    updatedAt: string;
    announcements: Array<{ id: string; message: string; priority: string }>;
    log: Array<{ at: string; action: string; detail: string }>;
  } | null;
}

export default function EmergencyModePage() {
  const [state, setState] = useState<EmergencyState | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'normal'>('urgent');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch('/api/emergency', { cache: 'no-store' });
    setState((await res.json()) as EmergencyState);
  }

  useEffect(() => {
    let active = true;
    fetch('/api/emergency', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: EmergencyState) => {
        if (active) setState(json);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'auth', pin }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || 'Incorrect PIN.');
      return;
    }
    setPin('');
    toast.success('Emergency mode unlocked for 2 hours.');
    await refresh();
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    const res = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'announcement',
        message: message.trim(),
        priority,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || 'Failed to publish.');
      return;
    }
    setMessage('');
    toast.success('Emergency announcement published to fallback snapshot!');
    await refresh();
  }

  async function clearOverlay() {
    setBusy(true);
    await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clear' }),
    });
    setBusy(false);
    toast.success('Emergency overrides cleared.');
    await refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/safety"
          className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl text-[#FF4F5E]">
            <ShieldAlert className="size-6" />
            EMERGENCY MODE
          </h1>
          <p className="text-xs text-[#9C97B0]">
            Works even when Supabase is completely down — writes straight to
            backup snapshot
          </p>
        </div>
      </div>

      {!state ? (
        <div className="flex justify-center p-10">
          <Loader2 className="size-6 animate-spin text-[#FFD60A]" />
        </div>
      ) : !state.configured ? (
        <div className="rounded-2xl border border-[#FFE14D]/60 bg-[#1F1230] p-5 text-sm text-[#FFE14D]">
          Emergency PIN is not configured yet in server environment settings.
        </div>
      ) : !state.authenticated ? (
        <form
          onSubmit={unlock}
          className="rounded-2xl border border-[#FF4F5E]/60 bg-[#1F1230] p-5 space-y-4"
        >
          <p className="text-sm font-bold text-[#F4F2FA]">
            Enter the Emergency Organiser PIN (rate-limited: 5 tries / 15 min)
          </p>
          <input
            type="password"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Emergency PIN"
            className="h-12 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-4 text-sm text-[#F4F2FA] outline-none focus:border-[#FF4F5E]"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#FF4F5E] text-sm font-extrabold text-white cursor-pointer"
          >
            {busy ? 'Checking…' : 'Unlock Emergency Mode'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <form
            onSubmit={postAnnouncement}
            className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-5 space-y-3"
          >
            <h2 className="font-heading text-base font-extrabold text-[#F4F2FA]">
              Publish Emergency Announcement
            </h2>
            <textarea
              rows={3}
              required
              maxLength={280}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. StreetPlay delayed by 20 mins due to rain."
              className="w-full rounded-xl border border-[#3B2758] bg-[#12091E] p-3 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
            <div className="flex items-center gap-3">
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'urgent' | 'normal')
                }
                className="h-10 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-bold text-[#F4F2FA]"
              >
                <option value="urgent">Urgent Banner</option>
                <option value="normal">Normal Notice</option>
              </select>
              <button
                type="submit"
                disabled={busy}
                className="h-10 flex-1 rounded-xl bg-[#FFD60A] text-xs font-extrabold text-[#12091E] cursor-pointer"
              >
                Publish to Live Fallback
              </button>
            </div>
          </form>

          {state.overlay && state.overlay.announcements.length > 0 && (
            <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase text-[#FFE14D]">
                  Active Emergency Notices
                </h3>
                <button
                  type="button"
                  onClick={() => void clearOverlay()}
                  className="text-xs font-bold text-[#FF4F5E] underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              {state.overlay.announcements.map((a) => (
                <p
                  key={a.id}
                  className="rounded-xl bg-[#12091E] p-2.5 text-xs text-[#F4F2FA]"
                >
                  [{a.priority.toUpperCase()}] {a.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
