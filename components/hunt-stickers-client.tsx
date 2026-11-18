'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, QrCode, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

export interface StampQrItem {
  point_id: string;
  sort: number;
  name: string;
  clue: string;
  hint: string | null;
  path: string;
  active: boolean;
}

export function HuntStickersClient({
  items,
  siteUrl,
  canRotate = false,
  onRotate,
}: {
  items: StampQrItem[];
  siteUrl: string;
  canRotate?: boolean;
  onRotate?: (pointId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const origin = (siteUrl || window.location.origin).replace(/\/$/, '');
    Promise.all(
      items.map(async (item) => {
        const url = `${origin}${item.path}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        return [item.point_id, dataUrl] as const;
      })
    )
      .then((entries) => {
        if (!active) return;
        setQrMap(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [items, siteUrl]);

  async function handleRotate(pointId: string) {
    if (!onRotate) return;
    setRotatingId(pointId);
    const res = await onRotate(pointId);
    setRotatingId(null);
    if (!res.ok) toast.error(res.error || 'Could not rotate code.');
    else toast.success('Code rotated! Reprint this sticker — old sticker is now invalid.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/hunt"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl text-[#F4F2FA] sm:text-3xl">
              HUNT QR STICKERS
            </h1>
            <p className="text-xs text-[#9C97B0]">
              Static stickers — print once and stick at each hidden spot. Place
              names are hidden from the printed sticker!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
        >
          <Printer className="size-4" />
          Print all {items.filter((i) => i.active).length} stickers (PDF)
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3B2758] bg-[#1F1230] p-8 text-center text-sm text-[#9C97B0]">
          No Treasure Hunt places found yet. Run{' '}
          <code>supabase/UPGRADE_HUNT_AND_HOSTS.sql</code> or add places in{' '}
          <code>/admin/hunt</code>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
          {items
            .filter((i) => i.active)
            .map((item) => (
              <article
                key={item.point_id}
                className="break-inside-avoid rounded-[22px] border-2 border-[#3B2758] bg-white p-5 text-[#12091E] space-y-3 print:border-black"
              >
                {/* Staff-only placement note (hidden when printing!) */}
                <div className="flex items-center justify-between gap-2 rounded-xl bg-[#12091E] px-3 py-1.5 text-xs text-[#FFD60A] print:hidden">
                  <span className="font-extrabold">
                    Stick at: {item.name} (#{item.sort})
                  </span>
                  {canRotate && onRotate && (
                    <button
                      type="button"
                      disabled={rotatingId === item.point_id}
                      onClick={() => void handleRotate(item.point_id)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#FF4F5E] px-2 py-0.5 text-[10px] font-extrabold text-white cursor-pointer"
                    >
                      <RotateCw className="size-3" />
                      Rotate leaked code
                    </button>
                  )}
                </div>

                {/* Printed Sticker Face (NEVER reveals hidden place name!) */}
                <div className="text-center space-y-2">
                  <p className="font-display text-xl tracking-wide text-[#12091E]">
                    FIESTA&apos;26 TREASURE HUNT
                  </p>
                  <p className="inline-block rounded-full bg-[#FFD60A] px-3 py-0.5 text-xs font-extrabold uppercase">
                    HIDDEN SPOT #{item.sort} · +10 PTS
                  </p>

                  <div className="mx-auto flex size-56 items-center justify-center rounded-2xl border-2 border-[#12091E] bg-white p-2">
                    {qrMap[item.point_id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrMap[item.point_id]}
                        alt={`Treasure Hunt QR sticker #${item.sort}`}
                        className="size-full object-contain"
                      />
                    ) : (
                      <QrCode className="size-10 text-[#9C97B0]" />
                    )}
                  </div>

                  <p className="text-xs font-bold text-[#12091E]">
                    Scan with Fiesta&apos;26 Live or your phone camera to collect
                    this stamp!
                  </p>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
