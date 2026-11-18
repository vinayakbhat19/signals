import type { Metadata } from 'next';
import Link from 'next/link';
import { Vote } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Audience Voting',
  description: 'Vote live in campus competitions at Fiest 2026.',
};

export default function VoteHubPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Audience Voting"
        subtitle="Live stage polls will appear here when competitions open."
      />
      <div className="flex flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#FF4FD8] text-[#12091E] shadow-[4px_4px_0_#FFD60A]">
          <Vote className="size-8 stroke-[2.2]" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Live voting unlocks in Track V
          </h2>
          <p className="max-w-sm text-sm text-[#9C97B0]">
            Once voting opens for Battle of Bands, Solo Singing, or other stage
            events, scan the stage screen QR or tap here to cast your vote.
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
        >
          See all events
        </Link>
      </div>
    </div>
  );
}
