'use client';

import Image from 'next/image';
import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { HuntMascots } from '@/components/mascots';

const SEEN_WELCOME_KEY = 'fiesta26:seen-welcome';

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_WELCOME_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

export default function WelcomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-[#12091E] text-[#F4F2FA]">
      {/* Halftone Fiesta'26 Hero Band */}
      <div className="halftone-band flex flex-col items-center gap-4 border-b border-[#3B2758] px-6 pt-12 pb-8 text-center">
        <Image
          src="/brand/fiesta26-logo.png"
          alt="Fiesta 2026"
          width={240}
          height={92}
          className="h-24 w-auto object-contain"
          priority
        />
        <span className="-rotate-2 rounded-full bg-[#FFD60A] px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[#12091E]">
          SDMCET DHARWAD · 25–27 NOV 2026
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 py-7">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <HuntMascots />
          </div>
          <h1 className="font-display text-[30px] leading-tight text-[#F4F2FA]">
            YOUR LIVE FEST GUIDE
          </h1>
          <p className="text-sm leading-relaxed text-[#CFCBDD]">
            See what&apos;s live now, register for events, vote in stage
            competitions, and play the campus Stamp Hunt — all in one fast web
            app.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/signup"
            onClick={markSeen}
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8]"
          >
            Create account
          </Link>

          <Link
            href="/login"
            onClick={markSeen}
            className="flex h-12 w-full items-center justify-center rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-extrabold text-[#F4F2FA] hover:border-[#FFD60A]"
          >
            Log in
          </Link>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Link
              href="/"
              onClick={markSeen}
              className="flex h-11 items-center justify-center rounded-[14px] border border-[#3B2758] text-xs font-bold text-[#CFCBDD] hover:text-[#F4F2FA]"
            >
              Just look around
            </Link>
            <Link
              href="/scan"
              onClick={markSeen}
              className="flex h-11 items-center justify-center gap-1.5 rounded-[14px] border border-[#FFD60A]/50 text-xs font-extrabold text-[#FFD60A]"
            >
              <QrCode className="size-4" aria-hidden="true" />
              Scan a QR
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
