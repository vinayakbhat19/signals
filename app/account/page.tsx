import type { Metadata } from 'next';
import Link from 'next/link';
import { AlienMascot } from '@/components/mascots';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Your Fiest 2026 profile, badges, and account settings.',
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <PageHeader
        title="My Account"
        subtitle="Sign in with your @sdmcet.ac.in email or Google to vote and collect stamps."
      />
      <div className="flex flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-7 text-center">
        <AlienMascot size={64} />
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Accounts & Sign-in coming next (Track A)
          </h2>
          <p className="text-sm text-[#9C97B0]">
            Browsing the schedule, venues, and live updates never requires an
            account.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/install"
            className="inline-flex min-h-11 items-center rounded-xl bg-[#C6FF3D] px-4 text-sm font-extrabold text-[#0B0A12]"
          >
            Add to Home Screen
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-[#2E2A3D] px-4 text-sm font-bold text-[#F4F2FA]"
          >
            About Fiest 2026
          </Link>
        </div>
      </div>
    </div>
  );
}
