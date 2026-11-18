'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface QrItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export function AdminQrClient({
  siteUrl,
  events,
  venues,
}: {
  siteUrl: string;
  events: Array<{ id: string; title: string; subtitle: string }>;
  venues: Array<{ id: string; name: string; description: string | null }>;
}) {
  const [mode, setMode] = useState<'home' | 'events' | 'venues'>('home');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  const items: QrItem[] =
    mode === 'home'
      ? [
          {
            id: 'home',
            title: "Fiesta'26 Live",
            subtitle: 'Scan for live schedule, registration, voting & Stamp Hunt',
            url: `${siteUrl}/?src=qr-home`,
          },
          {
            id: 'linktree',
            title: "Fiesta'26 Registrations",
            subtitle: 'Official Linktree registration hub',
            url: 'https://linktr.ee/sdmcetFiesta26',
          },
        ]
      : mode === 'events'
        ? events.map((e) => ({
            id: e.id,
            title: e.title,
            subtitle: e.subtitle,
            url: `${siteUrl}/events/${e.id}?src=qr-event-${e.id}`,
          }))
        : venues.map((v) => ({
            id: v.id,
            title: v.name,
            subtitle: v.description ?? 'Tap for today’s events at this venue',
            url: `${siteUrl}/venues/${v.id}?src=qr-venue-${v.id}`,
          }));

  useEffect(() => {
    let active = true;
    Promise.all(
      items.map(async (item) => {
        const dataUrl = await QRCode.toDataURL(item.url, {
          width: 420,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: { dark: '#12091E', light: '#FFFFFF' },
        });
        return [item.id, dataUrl] as const;
      })
    ).then((pairs) => {
      if (active) setQrMap(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, siteUrl]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-1.5 rounded-[14px] border border-[#3B2758] bg-[#1F1230] p-1">
          {(
            [
              { id: 'home', label: 'App Home' },
              { id: 'events', label: `All Events (${events.length})` },
              { id: 'venues', label: `All Venues (${venues.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={
                mode === t.id
                  ? 'h-9 rounded-lg bg-[#FFD60A] px-3 text-xs font-extrabold text-[#12091E] cursor-pointer'
                  : 'h-9 rounded-lg px-3 text-xs font-bold text-[#BDB8CF] cursor-pointer'
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
        >
          <Printer className="size-4" /> Print A4 Posters
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        {items.map((item) => {
          const dataUrl = qrMap[item.id];
          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-[#3B2758] bg-[#1F1230] p-5 text-center break-inside-avoid print:border-black print:bg-white print:text-black"
            >
              <span className="rounded-full bg-[#FFD60A] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#12091E]">
                FIESTA&apos;26 LIVE · SDMCET
              </span>
              {dataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={dataUrl}
                  alt={`QR for ${item.title}`}
                  className="size-52 rounded-2xl bg-white p-2"
                />
              ) : (
                <div className="size-52 rounded-2xl bg-[#12091E]" />
              )}
              <div className="space-y-0.5">
                <h3 className="font-heading text-lg font-extrabold">
                  {item.title}
                </h3>
                <p className="text-xs text-[#BDB8CF] print:text-neutral-600">
                  {item.subtitle}
                </p>
              </div>
              <div className="flex gap-2 pt-1 print:hidden">
                {dataUrl && (
                  <a
                    href={dataUrl}
                    download={`fiesta26-qr-${item.id}.png`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3 text-xs font-extrabold text-[#12091E]"
                  >
                    <Download className="size-3.5" /> PNG
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(item.url);
                    toast.success('Link copied');
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs font-bold text-[#F4F2FA] cursor-pointer"
                >
                  <Copy className="size-3.5" /> Copy link
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
