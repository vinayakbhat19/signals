'use client';

import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

export function EventShareIconButton({
  title,
  shareText,
}: {
  title: string;
  shareText: string;
}) {
  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Event link copied');
    } catch {
      toast.error('Copy the URL from your browser address bar');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      aria-label="Share event"
      className="flex size-11 items-center justify-center rounded-[14px] bg-[#12091E]/90 text-[#F4F2FA] backdrop-blur-xs hover:bg-[#12091E] cursor-pointer"
    >
      <Share2 className="size-5" aria-hidden="true" />
    </button>
  );
}

export function EventCountdownBoxes({
  startsAtIso,
  serverTimeIso,
}: {
  startsAtIso: string;
  serverTimeIso: string;
}) {
  const [remainingSec, setRemainingSec] = useState<number>(() =>
    Math.max(
      0,
      Math.floor(
        (new Date(startsAtIso).getTime() - new Date(serverTimeIso).getTime()) /
          1000
      )
    )
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remainingSec <= 0) return null;

  const hours = Math.floor(remainingSec / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="grid grid-cols-3 gap-2"
      aria-label={`Starts in ${hours} hours ${mins} minutes ${secs} seconds`}
    >
      {[
        { value: pad(hours), label: 'HOURS' },
        { value: pad(mins), label: 'MINS' },
        { value: pad(secs), label: 'SECS' },
      ].map((box) => (
        <div
          key={box.label}
          className="rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-2.5 py-2.5 text-center"
        >
          <div className="font-heading text-[30px] font-extrabold leading-tight text-[#FFD60A]">
            {box.value}
          </div>
          <div className="text-[11px] font-extrabold tracking-[0.06em] text-[#9C97B0]">
            {box.label}
          </div>
        </div>
      ))}
    </div>
  );
}
