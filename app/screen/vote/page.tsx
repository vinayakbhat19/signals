'use client';

import { Suspense, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Compass, Trophy } from 'lucide-react';
import { getSiteOrigin } from '@/lib/site-url';

function StageVoteScreenInner() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');

  useEffect(() => {
    const origin = getSiteOrigin();
    const url = `${origin}/hunt/leaderboard/`;
    setTargetUrl(url);
    void QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      color: { dark: '#12091E', light: '#FFFFFF' },
    }).then(setQrDataUrl);
  }, []);

  return (
    <div className="min-h-screen bg-[#100A1C] text-[#F5F2FB] p-8 md:p-14 flex flex-col justify-between">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FFDC14]">
            FIESTA&apos;26 · SDMCET DHARWAD · FESTIVAL NOTICE
          </p>
          <h1 className="mt-1 text-3xl md:text-5xl font-black tracking-tight">
            Audience Voting Notice
          </h1>
        </div>
        <div className="rounded-full bg-[#E83295]/20 border border-[#E83295]/50 px-5 py-2 text-sm font-black uppercase tracking-wider text-[#FFDC14]">
          VOTING CANCELLED
        </div>
      </header>

      <div className="my-12 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-center flex-1">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#1F1534] p-8 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#FF4FD8]/20 px-3.5 py-1.5 text-sm font-extrabold text-[#FF4FD8]">
              <Trophy className="size-4" />
              OFFICIAL FESTIVAL UPDATE
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#F4F2FA]">
              Audience voting has been cancelled by event organizers.
            </h2>
            <p className="text-lg text-[#C9C1D9] leading-relaxed">
              All competitions and stage performances are judged directly by the
              official jury panel.
            </p>
          </div>

          <div className="rounded-3xl border border-[#9B6CFF]/40 bg-[#9B6CFF]/10 p-6 space-y-2">
            <p className="text-sm font-extrabold uppercase tracking-wider text-[#FFDC14] flex items-center gap-2">
              <Compass className="size-4 text-[#FFDC14]" />
              Join the Campus Treasure Hunt!
            </p>
            <p className="text-base text-[#F4F2FA]">
              10 hidden spots are scattered across SDMCET. Scan the QR code to
              view the live Leaderboard, solve clues, and win prizes!
            </p>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="rounded-3xl border-2 border-[#FFDC14] bg-[#1F1534] p-6 text-center space-y-4 shadow-[6px_6px_0_#E83295]">
          <p className="text-xs font-black uppercase tracking-widest text-[#FFDC14]">
            SCAN FOR HUNT LEADERBOARD
          </p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR Code for Hunt Leaderboard"
              className="mx-auto size-64 rounded-2xl bg-white p-2.5 shadow-md"
            />
          ) : (
            <div className="mx-auto size-64 rounded-2xl bg-white/10 animate-pulse" />
          )}
          <p className="font-mono text-xs font-bold text-[#FFDC14] break-all">
            {targetUrl}
          </p>
        </div>
      </div>

      <footer className="border-t border-white/10 pt-4 text-xs text-[#9C97B0] flex justify-between items-center">
        <span>Fiesta&apos;26 · Powered by Signals</span>
        <span>SDMCET Dharwad</span>
      </footer>
    </div>
  );
}

export default function StageVoteScreen() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#100A1C] text-[#F5F2FB] flex items-center justify-center font-bold">
          Loading Notice…
        </div>
      }
    >
      <StageVoteScreenInner />
    </Suspense>
  );
}
