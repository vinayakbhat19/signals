'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { getSiteOrigin } from '@/lib/site-url';

export default function AdminQrPostersPage() {
  const { feed } = useLiveFeed();
  const [target, setTarget] = useState<'home' | 'hunt' | 'event' | 'leaderboard'>('home');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const evId = selectedEventId || feed.events[0]?.id || '';
  const selectedEvent = feed.events.find((e) => e.id === evId);

  const relativePath =
    target === 'home'
      ? '/'
      : target === 'hunt'
        ? '/hunt/'
        : target === 'leaderboard'
          ? '/hunt/leaderboard/'
          : `/event/?id=${evId}`;

  const headline =
    target === 'home'
      ? "FIESTA'26 LIVE GUIDE"
      : target === 'hunt'
        ? "FIESTA'26 TREASURE HUNT"
        : target === 'leaderboard'
          ? "FIESTA'26 HUNT LEADERBOARD"
          : selectedEvent?.title || 'EVENT';

  const origin = getSiteOrigin();
  const effectiveUrl = `${origin}${relativePath}`;

  useEffect(() => {
    QRCode.toDataURL(effectiveUrl, { width: 420, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [effectiveUrl]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-3 rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl text-[#F4F2FA]">QR POSTERS</h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
          >
            <Printer className="size-4" />
            Print A4 Poster
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(['home', 'hunt', 'event', 'leaderboard'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={`h-10 rounded-xl border text-xs font-extrabold uppercase cursor-pointer ${
                target === t
                  ? 'border-[#FFD60A] bg-[#FFD60A] text-[#12091E]'
                  : 'border-[#3B2758] bg-[#12091E] text-[#CFCBDD]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {target === 'event' && (
          <select
            value={evId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          >
            {feed.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Printable Poster Card */}
      <div className="rounded-[28px] border-4 border-[#FFD60A] bg-white p-8 text-center text-[#12091E] space-y-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#FF4FD8]">
          SDM COLLEGE OF ENGINEERING &amp; TECHNOLOGY · 25–28 NOV
        </p>
        <h3 className="font-display text-3xl text-[#12091E]">{headline}</h3>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Poster QR"
            className="mx-auto size-72 rounded-2xl border-4 border-[#12091E] p-2"
          />
        )}
        <p className="font-mono text-xs font-bold text-[#5A4B75] break-all">
          {effectiveUrl}
        </p>
        <p className="text-sm font-extrabold">
          Point your phone camera here to open immediately!
        </p>
      </div>
    </div>
  );
}
