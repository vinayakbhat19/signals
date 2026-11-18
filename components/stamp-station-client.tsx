'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { WifiOff } from 'lucide-react';
import { formatTime } from '@/lib/time';

interface StationState {
  code: string;
  expires_in: number;
  total_stamps: number;
  last_minute: number;
}

interface StampStationClientProps {
  pointId: string;
  pointName: string;
  venueName: string | null;
  endsAt: string | null;
  bonusActive: boolean;
  siteUrl: string;
  initialState: StationState;
}

export function StampStationClient({
  pointId,
  pointName,
  venueName,
  endsAt,
  bonusActive,
  siteUrl,
  initialState,
}: StampStationClientProps) {
  const [state, setState] = useState<StationState>(initialState);
  const [secondsLeft, setSecondsLeft] = useState<number>(
    initialState.expires_in
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [wakeLocked, setWakeLocked] = useState(false);
  const [offlineSeconds, setOfflineSeconds] = useState(0);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/station/${pointId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as StationState;
      setState(next);
      setSecondsLeft(Math.max(1, next.expires_in));
      setOfflineSeconds(0);
    } catch {
      setOfflineSeconds((prev) => prev + 5);
    }
  }, [pointId]);

  // Generate crisp QR data URL whenever rotating code updates
  useEffect(() => {
    const targetUrl = `${siteUrl}/stamp/${pointId}?c=${encodeURIComponent(state.code)}`;
    void QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#12091E', light: '#F4F2FA' },
    }).then((url) => setQrDataUrl(url));
  }, [pointId, siteUrl, state.code]);

  // 1-second countdown; refreshes immediately when hitting 0
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          void fetchLatest();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [fetchLatest]);

  // Safety net poll every 15 s for stamp counters + clock drift
  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchLatest();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [fetchLatest]);

  // Screen Wake Lock so volunteer phone stays awake
  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | null = null;
    async function requestWakeLock() {
      const nav = navigator as Navigator & {
        wakeLock?: {
          request: (type: 'screen') => Promise<{ release: () => Promise<void> }>;
        };
      };
      if (!nav.wakeLock) return;
      try {
        sentinel = await nav.wakeLock.request('screen');
        setWakeLocked(true);
      } catch {
        setWakeLocked(false);
      }
    }
    void requestWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) void sentinel.release();
    };
  }, []);

  const ringTotal = 1130;
  const ringOffset = Math.round(((30 - secondsLeft) / 30) * ringTotal);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between bg-[#12091E] px-5 py-5 text-[#F4F2FA]">
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#9B6CFF]">
            STAMP STATION
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-[#FFD60A]">
            <span className="size-2.5 rounded-full bg-[#FFD60A]" />
            {wakeLocked ? 'Online · screen stays on' : 'Keep this screen on'}
          </span>
        </div>

        {offlineSeconds >= 20 && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#FF4F5E] bg-[#FF4F5E]/20 px-3.5 py-2.5 text-xs font-bold text-[#FF9EA7]">
            <WifiOff className="size-4 shrink-0" />
            Offline for {offlineSeconds}s — reconnect or show printed backup
            standee
          </div>
        )}

        <div className="text-center space-y-1 pt-2">
          <h1 className="font-heading text-[34px] font-extrabold leading-none tracking-[-0.03em]">
            {pointName}
          </h1>
          <p className="text-sm text-[#BDB8CF]">
            {venueName ?? 'Campus'}
            {endsAt ? ` · live until ${formatTime(endsAt)}` : ''}
          </p>
          {bonusActive && (
            <span className="mt-1 inline-block rounded-full bg-[#FFE14D] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.06em] text-[#12091E]">
              BONUS +5 ACTIVE · FINAL ROUND
            </span>
          )}
        </div>
      </div>

      {/* Rotating QR + Animated Countdown Ring matching 46-stamp-station.png */}
      <div className="my-5 flex flex-col items-center">
        <div className="relative flex size-[310px] items-center justify-center sm:size-[340px]">
          <svg
            viewBox="0 0 380 380"
            aria-hidden="true"
            className="absolute inset-0 size-full"
          >
            <rect
              x="10"
              y="10"
              width="360"
              height="360"
              rx="44"
              fill="none"
              stroke="#3B2758"
              strokeWidth="8"
            />
            <rect
              x="10"
              y="10"
              width="360"
              height="360"
              rx="44"
              fill="none"
              stroke="#FFD60A"
              strokeWidth="8"
              strokeDasharray={`${ringTotal} ${ringTotal}`}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
          </svg>

          <div
            className="flex size-[254px] items-center justify-center overflow-hidden rounded-[26px] bg-[#F4F2FA] p-4 sm:size-[276px]"
            aria-label={`Live QR code for ${pointName}`}
          >
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt={`Live QR code for ${pointName}`}
                className="size-full object-contain"
              />
            ) : (
              <span className="text-xs font-bold text-[#12091E]">
                Generating QR…
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 font-heading text-[22px] font-extrabold">
          New code in <span className="text-[#FFD60A]">{secondsLeft} s</span>
        </p>
        <p className="mt-1 text-center text-sm text-[#BDB8CF]">
          Point your camera here to collect the stamp
        </p>
      </div>

      {/* Live Stamp Counters */}
      <div className="w-full space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-3.5">
            <div className="font-heading text-3xl font-extrabold text-[#FFD60A]">
              {state.total_stamps}
            </div>
            <div className="text-xs font-bold text-[#BDB8CF]">stamps here</div>
          </div>
          <div className="rounded-[18px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-3.5">
            <div className="font-heading text-3xl font-extrabold text-[#F4F2FA]">
              {state.last_minute}
            </div>
            <div className="text-xs font-bold text-[#BDB8CF]">
              in the last minute
            </div>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-[#9C97B0]">
          Volunteer: keep this phone on charge, brightness up. If it dies, use
          the printed backup standee.
        </p>
      </div>
    </div>
  );
}
