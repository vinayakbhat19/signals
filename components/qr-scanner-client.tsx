'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  ExternalLink,
  Flashlight,
  ImageUp,
  Keyboard,
  QrCode,
  Stamp,
  Vote,
  X,
} from 'lucide-react';

interface ParsedQrTarget {
  kind: 'stamp' | 'vote' | 'event' | 'hunt' | 'external';
  label: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  rawUrl: string;
}

function parseFestQr(raw: string): ParsedQrTarget {
  const trimmed = raw.trim();
  let url: URL | null = null;

  try {
    url = new URL(trimmed);
  } catch {
    if (trimmed.startsWith('/')) {
      try {
        url = new URL(trimmed, 'https://fest.live');
      } catch {
        url = null;
      }
    }
  }

  if (url) {
    const path = url.pathname;

    // /stamp/<pointId>?c=<code>
    const stampMatch = path.match(/^\/stamp\/([0-9a-f-]{36})$/i);
    if (stampMatch) {
      const code = url.searchParams.get('c') ?? '';
      return {
        kind: 'stamp',
        label: 'FOUND · STAMP STATION',
        title: 'Stamp Station QR',
        subtitle: code
          ? 'Live stamp code ready to claim'
          : 'Tap below to open stamp station',
        ctaLabel: 'Collect stamp',
        href: `/stamp/${stampMatch[1]}${code ? `?c=${encodeURIComponent(code)}` : ''}`,
        rawUrl: trimmed,
      };
    }

    // /vote/<eventId>
    const voteMatch = path.match(/^\/vote\/([0-9a-f-]{36})$/i);
    if (voteMatch) {
      return {
        kind: 'vote',
        label: 'FOUND · AUDIENCE VOTE',
        title: 'Live Audience Poll',
        subtitle: 'Tap below to cast your vote',
        ctaLabel: 'Open vote',
        href: `/vote/${voteMatch[1]}`,
        rawUrl: trimmed,
      };
    }

    // /events/<id>
    const eventMatch = path.match(/^\/events\/([0-9a-f-]{36})$/i);
    if (eventMatch) {
      return {
        kind: 'event',
        label: 'FOUND · FEST EVENT',
        title: 'Event Page',
        subtitle: 'See time, venue, line-up & updates',
        ctaLabel: 'Open event',
        href: `/events/${eventMatch[1]}`,
        rawUrl: trimmed,
      };
    }

    // /hunt
    if (path === '/hunt' || path === '/hunt/leaderboard') {
      return {
        kind: 'hunt',
        label: 'FOUND · STAMP HUNT',
        title: 'Fest Stamp Hunt',
        subtitle: 'Open your passport and live leaderboard',
        ctaLabel: 'Open Stamp Hunt',
        href: path,
        rawUrl: trimmed,
      };
    }

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return {
        kind: 'external',
        label: 'EXTERNAL LINK',
        title: url.hostname,
        subtitle: trimmed,
        ctaLabel: 'Open external link',
        href: trimmed,
        rawUrl: trimmed,
      };
    }
  }

  return {
    kind: 'external',
    label: 'UNRECOGNISED CODE',
    title: 'Not a Fest Live QR',
    subtitle: trimmed,
    ctaLabel: 'Scan again',
    href: '',
    rawUrl: trimmed,
  };
}

interface BarcodeDetectorLike {
  detect(
    source: HTMLVideoElement | ImageBitmap
  ): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
  }
}

export function QrScannerClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [cameraState, setCameraState] = useState<
    'idle' | 'starting' | 'active' | 'denied' | 'unsupported'
  >('idle');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState<ParsedQrTarget | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  function stopCamera() {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }

  async function openCamera() {
    setPhotoError(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraState('unsupported');
      return;
    }
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      const track = stream.getVideoTracks()[0] ?? null;
      trackRef.current = track;

      if (track && typeof track.getCapabilities === 'function') {
        const caps = track.getCapabilities() as MediaTrackCapabilities & {
          torch?: boolean;
        };
        if (caps.torch) setTorchSupported(true);
      }

      setCameraState('active');

      if (typeof window.BarcodeDetector === 'function') {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        let lastScanTime = 0;

        const scanLoop = async (ts: number) => {
          if (!streamRef.current) return;
          if (ts - lastScanTime > 220 && video && video.readyState >= 2) {
            lastScanTime = ts;
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0 && codes[0].rawValue) {
                setDetected(parseFestQr(codes[0].rawValue));
                stopCamera();
                setCameraState('idle');
                return;
              }
            } catch {
              // Ignore single-frame error
            }
          }
          rafRef.current = window.requestAnimationFrame((t) => void scanLoop(t));
        };

        rafRef.current = window.requestAnimationFrame((t) => void scanLoop(t));
      }
    } catch {
      stopCamera();
      setCameraState('denied');
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    if (typeof window.BarcodeDetector !== 'function') {
      setPhotoError(
        'This browser cannot decode QR photos directly. Please use "Enter a code instead".'
      );
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(bitmap);
      bitmap.close();
      if (codes.length > 0 && codes[0].rawValue) {
        setDetected(parseFestQr(codes[0].rawValue));
      } else {
        setPhotoError('No QR code detected in that photo. Try getting closer or enter the code.');
      }
    } catch {
      setPhotoError('Could not read that photo. Try again or enter the code.');
    }
  }

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        stopCamera();
        setCameraState((prev) => (prev === 'active' ? 'idle' : prev));
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopCamera();
    };
  }, []);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // Ignore torch toggle failures on unsupported devices
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setDetected(parseFestQr(manualInput));
    setShowManual(false);
  }

  function handleProceed(target: ParsedQrTarget) {
    if (!target.href) {
      setDetected(null);
      return;
    }
    if (target.kind === 'external') {
      window.open(target.href, '_blank', 'noopener,noreferrer');
      setDetected(null);
      return;
    }
    router.push(target.href);
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden bg-[#12091E] text-[#F4F2FA]">
      {/* Live Camera Feed Background */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#12091E]/80 via-[#12091E]/25 to-[#12091E]/90" />

      {/* Top Bar matching 20-scan.png */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-4">
        <Link
          href="/"
          aria-label="Close scanner"
          className="flex size-11 items-center justify-center rounded-[14px] bg-[#1F1230]/90 text-[#F4F2FA] backdrop-blur-xs"
        >
          <X className="size-5 stroke-[2.5]" aria-hidden="true" />
        </Link>

        <span className="rounded-[14px] bg-[#1F1230]/90 px-5 py-2.5 font-heading text-lg font-extrabold backdrop-blur-xs">
          Scan
        </span>

        <button
          type="button"
          onClick={() => void toggleTorch()}
          disabled={!torchSupported}
          aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
          className="flex size-11 items-center justify-center rounded-[14px] bg-[#1F1230]/90 text-[#FFE14D] backdrop-blur-xs disabled:opacity-40 cursor-pointer"
        >
          <Flashlight className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Center Viewfinder Frame */}
      <div className="relative z-10 flex flex-col items-center px-6">
        <div className="relative flex size-[248px] items-center justify-center">
          {/* 4 Neon Lime Corner Brackets */}
          <span className="absolute top-0 left-0 h-11 w-11 rounded-tl-2xl border-t-[5px] border-l-[5px] border-[#FFD60A]" />
          <span className="absolute top-0 right-0 h-11 w-11 rounded-tr-2xl border-t-[5px] border-r-[5px] border-[#FFD60A]" />
          <span className="absolute bottom-0 left-0 h-11 w-11 rounded-bl-2xl border-b-[5px] border-l-[5px] border-[#FFD60A]" />
          <span className="absolute right-0 bottom-0 h-11 w-11 rounded-br-2xl border-r-[5px] border-b-[5px] border-[#FFD60A]" />

          {/* Sweeping Neon Scan Line */}
          {cameraState === 'active' && !detected && (
            <div className="scan-line absolute inset-x-4 top-0 h-0.5 rounded-full bg-[#FFD60A] shadow-[0_0_14px_#FFD60A]" />
          )}

          {cameraState === 'idle' && !detected && (
            <div className="mx-3 flex flex-col items-center gap-2.5 rounded-2xl bg-[#1F1230]/95 p-4 text-center border border-[#3B2758]">
              <Camera className="size-7 text-[#FFD60A]" aria-hidden="true" />
              <button
                type="button"
                onClick={() => void openCamera()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] shadow-[3px_3px_0_#FF4FD8] cursor-pointer"
              >
                Open camera
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-[#22D3EE] underline">
                <ImageUp className="size-3.5" />
                Take a photo of the QR
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => void handlePhotoUpload(e)}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {cameraState === 'denied' && (
            <div className="mx-4 rounded-2xl bg-[#1F1230]/95 p-4 text-center space-y-2 border border-[#3B2758]">
              <AlertCircle
                className="mx-auto size-6 text-[#FFE14D]"
                aria-hidden="true"
              />
              <p className="text-xs font-bold text-[#F4F2FA]">
                Camera access blocked
              </p>
              <p className="text-[11px] text-[#9C97B0]">
                Allow camera in browser settings, or take a photo / enter the
                code below.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#FFD60A] px-2.5 py-1.5 text-[11px] font-extrabold text-[#12091E]">
                  <ImageUp className="size-3" />
                  Take photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => void handlePhotoUpload(e)}
                    className="hidden"
                  />
                </label>
                <Link
                  href="/account/permissions"
                  className="inline-flex items-center rounded-lg border border-[#3B2758] px-2.5 py-1.5 text-[11px] font-bold text-[#F4F2FA]"
                >
                  Fix steps
                </Link>
              </div>
            </div>
          )}

          {cameraState === 'unsupported' && (
            <div className="mx-4 rounded-2xl bg-[#1F1230]/95 p-4 text-center space-y-2 border border-[#3B2758]">
              <QrCode
                className="mx-auto size-6 text-[#FFD60A]"
                aria-hidden="true"
              />
              <p className="text-xs font-bold text-[#F4F2FA]">
                Use your phone&apos;s camera app or enter a link below
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 max-w-xs rounded-2xl bg-[#1F1230]/90 px-4 py-2.5 text-center text-xs font-semibold leading-snug text-[#F4F2FA] backdrop-blur-xs">
          {photoError ||
            'Point at a Stamp Station, a vote screen, or an event poster'}
        </p>
      </div>

      {/* Bottom Sheet matching 20-scan.png */}
      <div className="relative z-10 rounded-t-[28px] border-t-[1.5px] border-[#3B2758] bg-[#1F1230] px-5 pt-3 pb-7 space-y-4">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#3A3549]" />

        {detected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#9B6CFF] text-[#12091E]">
                {detected.kind === 'stamp' && <Stamp className="size-6" />}
                {detected.kind === 'vote' && <Vote className="size-6" />}
                {detected.kind === 'event' && <CalendarDays className="size-6" />}
                {detected.kind === 'hunt' && <Stamp className="size-6" />}
                {detected.kind === 'external' && <ExternalLink className="size-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9B6CFF]">
                  {detected.label}
                </span>
                <span className="block truncate text-lg font-extrabold text-[#F4F2FA]">
                  {detected.title}
                </span>
                <span className="block truncate text-xs text-[#9C97B0]">
                  {detected.subtitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetected(null)}
                aria-label="Clear scanned QR"
                className="flex size-9 items-center justify-center rounded-lg text-[#9C97B0] hover:text-[#F4F2FA] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleProceed(detected)}
              className="flex h-[54px] w-full items-center justify-center rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
            >
              {detected.ctaLabel}
            </button>
          </div>
        ) : showManual ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#F4F2FA]">
                Paste QR link
              </span>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="text-xs font-bold text-[#9C97B0] cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Paste /stamp/... or full Fest Live QR URL"
              className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#12091E] px-3.5 text-sm text-[#F4F2FA] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
            />
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] cursor-pointer"
            >
              Open link
            </button>
          </form>
        ) : showHelp ? (
          <div className="space-y-2.5 text-xs text-[#CFCBDD]">
            <div className="flex items-center justify-between">
              <strong className="text-sm text-[#F4F2FA]">
                Camera not working?
              </strong>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="font-bold text-[#FFD60A] cursor-pointer"
              >
                Done
              </button>
            </div>
            <p>
              1. On <strong>iPhone / Android</strong>, you can always use your
              phone&apos;s normal Camera app — every Fest Live QR opens straight
              in this app.
            </p>
            <p>
              2. To enable in-app scanning: tap the lock/camera icon in your
              browser address bar → Allow Camera → reload this page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#2A1840] text-[#FFD60A]">
                <QrCode className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-[#F4F2FA]">
                  Ready to scan
                </p>
                <p className="text-xs text-[#9C97B0]">
                  Works with Stamp Stations, Vote screens, and Event posters
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setShowHelp(false);
              setShowManual((v) => !v);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 text-[#FFD60A] underline underline-offset-4 cursor-pointer"
          >
            <Keyboard className="size-3.5" aria-hidden="true" />
            Enter a code instead
          </button>
          <button
            type="button"
            onClick={() => {
              setShowManual(false);
              setShowHelp((v) => !v);
            }}
            className="min-h-9 text-[#BDB8CF] underline underline-offset-4 cursor-pointer"
          >
            Camera not working?
          </button>
        </div>
      </div>
    </div>
  );
}
