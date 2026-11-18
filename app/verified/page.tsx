import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { AlienMascot } from '@/components/mascots';
import { getProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function VerifiedPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <AlienMascot size={84} />
      <div className="space-y-2">
        {profile?.college_verified && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD60A] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#12091E]">
            <BadgeCheck className="size-4" />
            Verified SDMCET Student
          </span>
        )}
        <h1 className="font-display text-3xl text-[#F4F2FA]">
          YOU&apos;RE ALL SET!
        </h1>
        <p className="text-sm text-[#CFCBDD]">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}! You can
          now collect Stamp Hunt stamps and cast live audience votes at
          Fiesta&apos;26.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 pt-2">
        <Link
          href="/install"
          className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8]"
        >
          Add to Home Screen
        </Link>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-bold text-[#F4F2FA]"
        >
          Go to Fiesta&apos;26 Live →
        </Link>
      </div>
    </div>
  );
}
