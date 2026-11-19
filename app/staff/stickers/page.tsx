'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, Loader2, Printer, QrCode, RotateCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';
import { getSiteOrigin } from '@/lib/site-url';

interface StampQrItem {
  point_id: string;
  sort: number;
  name: string;
  clue: string;
  hint: string | null;
  path: string;
  active: boolean;
}

export default function StaffStickersPage() {
  const { loading: authLoading, canMakeQr, isOrganiser } = useAuth();
  const [items, setItems] = useState<StampQrItem[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  async function loadStickers() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('list_stamp_qrs');
    if (error || !Array.isArray(data)) {
      setItems([]);
      setLoading(false);
      return;
    }
    const list = data as StampQrItem[];
    setItems(list);
    const origin = getSiteOrigin();
    const entries = await Promise.all(
      list.map(async (item) => {
        const url = `${origin}${item.path}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        return [item.point_id, dataUrl] as const;
      })
    );
    setQrMap(Object.fromEntries(entries));
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !canMakeQr) return;
    const raf = window.requestAnimationFrame(() => void loadStickers());
    return () => window.cancelAnimationFrame(raf);
  }, [authLoading, canMakeQr]);

  async function rotateCode(pointId: string) {
    setRotatingId(pointId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('rotate_stamp_code', {
      p_point: pointId,
    });
    setRotatingId(null);
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      toast.error(error?.message || 'Could not rotate code.');
    } else {
      toast.success('Sticker code rotated! Reprint this sticker.');
      await loadStickers();
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!canMakeQr) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">NOT ALLOWED</h1>
        <p className="text-sm text-[#9C97B0]">
          Only volunteers, hosts, and organisers can generate Hunt QR stickers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={isOrganiser ? '/admin/hunt/' : '/volunteer/'}
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
              names never appear on the printed face!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
        >
          <Printer className="size-4" />
          Print all stickers (PDF)
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3B2758] bg-[#1F1230] p-8 text-center text-sm text-[#9C97B0]">
          No Treasure Hunt places found yet.
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
                <div className="flex items-center justify-between gap-2 rounded-xl bg-[#12091E] px-3 py-1.5 text-xs text-[#FFD60A] print:hidden">
                  <span className="font-extrabold">
                    Stick at: {item.name} (#{item.sort})
                  </span>
                  {isOrganiser && (
                    <button
                      type="button"
                      disabled={rotatingId === item.point_id}
                      onClick={() => void rotateCode(item.point_id)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#FF4F5E] px-2 py-0.5 text-[10px] font-extrabold text-white cursor-pointer"
                    >
                      <RotateCw className="size-3" />
                      Rotate
                    </button>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <p className="font-display text-xl text-[#12091E]">
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
                        alt={`Sticker #${item.sort}`}
                        className="size-full object-contain"
                      />
                    ) : (
                      <QrCode className="size-10 text-[#9C97B0]" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#12091E]">
                    Scan with Fiesta&apos;26 Live or your camera to claim!
                  </p>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
