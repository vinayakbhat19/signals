'use client';

import Link from 'next/link';
import { Bell, CheckCircle2, Compass } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';

export default function VerifiedPage() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#FFD60A] text-[#12091E] shadow-[4px_4px_0_#FF4FD8]">
        <CheckCircle2 className="size-8 stroke-[2.4]" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-[#F4F2FA]">YOU&apos;RE IN!</h1>
        <p className="text-sm text-[#CFCBDD]">
          Welcome to Fiesta&apos;26 Live
          {profile?.full_name ? `, ${profile.full_name}` : ''}! You can now play
          the Treasure Hunt and cast live audience votes.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        <Link
          href="/hunt/"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
        >
          <Compass className="size-4" />
          Start the Treasure Hunt
        </Link>
        <Link
          href="/account/permissions/"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-xs font-bold text-[#F4F2FA]"
        >
          <Bell className="size-4 text-[#FFD60A]" />
          Get alerts for delays &amp; changes
        </Link>
        <Link href="/" className="py-2 text-xs font-bold text-[#9C97B0]">
          Go to Home →
        </Link>
      </div>
    </div>
  );
}
