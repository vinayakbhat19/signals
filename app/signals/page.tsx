'use client';

import Link from 'next/link';
import { Archive, Radio, Sparkles } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { CAMPUS_BRAND } from '@/lib/modes';

export default function SignalsPage() {
  const { feed } = useLiveFeed();
  const isCampus = feed.status.mode === 'campus';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22D3EE]/20 px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#22D3EE]">
          <Radio className="size-3.5" />
          {CAMPUS_BRAND.name} · {CAMPUS_BRAND.tagline}
        </span>
        <h1 className="font-display text-3xl text-[#F4F2FA]">CAMPUS SIGNALS</h1>
        <p className="text-sm text-[#CFCBDD]">
          Find hackathon teammates, project partners, and campus club updates at{' '}
          {CAMPUS_BRAND.college}.
        </p>
      </header>

      {!isCampus ? (
        <div className="rounded-[22px] border-[1.5px] border-dashed border-[#FFD60A]/60 bg-[#1F1230] p-6 text-center space-y-3">
          <Sparkles className="mx-auto size-8 text-[#FFD60A]" />
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Fiesta&apos;26 is live right now!
          </h2>
          <p className="text-sm text-[#BDB8CF]">
            Signals returns automatically on <strong>28 Nov 2026</strong> right
            after Fiesta&apos;26 wraps up.
          </p>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
          >
            Back to Fiesta&apos;26 Live
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Link
            href="/fest-archive/"
            className="flex items-center justify-between rounded-[20px] border border-[#FFD60A]/50 bg-[#1F1230] px-4 py-3.5 text-sm font-bold text-[#FFD60A]"
          >
            <span className="flex items-center gap-2">
              <Archive className="size-4" />
              Fiesta&apos;26 Memories, Winners &amp; Results Archive
            </span>
            <span>Open →</span>
          </Link>

          <div className="rounded-[22px] border border-dashed border-[#22D3EE]/50 bg-[#1F1230] p-8 text-center space-y-2">
            <Radio className="mx-auto size-8 text-[#22D3EE]" />
            <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
              Signals is coming right back!
            </h2>
            <p className="text-xs text-[#BDB8CF]">
              Teammate matching &amp; campus project boards reopen shortly after
              the Fiesta&apos;26 archive wraps up.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
