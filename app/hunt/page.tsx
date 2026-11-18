import type { Metadata } from 'next';
import Link from 'next/link';
import { HuntMascots } from '@/components/mascots';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Stamp Hunt',
  description: 'Collect campus stamps at Fiest 2026 stations and climb the leaderboard.',
};

export default function HuntPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Stamp Hunt"
        subtitle="Visit campus stations, scan rotating QR codes, and climb the leaderboard."
      />
      <div className="flex flex-col items-center gap-4 rounded-[24px] bg-[#A78BFA] p-7 text-center text-[#0B0A12] shadow-[5px_5px_0_#C6FF3D]">
        <HuntMascots />
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-extrabold">
            Your Fest Passport launches in Track H
          </h2>
          <p className="max-w-sm text-sm font-semibold">
            Sign in on fest day and scan QR stations across venues to collect
            stamps and compete for the podium.
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#0B0A12] px-5 text-sm font-extrabold text-[#C6FF3D]"
        >
          Explore events
        </Link>
      </div>
    </div>
  );
}
