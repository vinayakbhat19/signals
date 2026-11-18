'use client';

import Link from 'next/link';
import { Compass, Loader2, Printer, ShieldAlert, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';

export default function VolunteerHomePage() {
  const { loading, isVolunteer, canMakeQr } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!isVolunteer && !canMakeQr) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">NOT ALLOWED</h1>
        <p className="text-sm text-[#9C97B0]">
          This area is only for invited Fiesta&apos;26 volunteers and staff.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22D3EE]/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-[#22D3EE]">
          <Compass className="size-3.5" />
          VOLUNTEER HUB
        </span>
        <h1 className="font-display text-3xl text-[#F4F2FA]">
          FIESTA&apos;26 STAFF TOOLS
        </h1>
        <p className="text-xs text-[#9C97B0]">
          Print Treasure Hunt stickers once before the fest and verify winners at
          the prize desk.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/staff/stickers/"
          className="rounded-[22px] border-[1.5px] border-[#FFD60A] bg-[#1F1230] p-5 space-y-2 shadow-[4px_4px_0_#FF4FD8]"
        >
          <Printer className="size-7 text-[#FFD60A]" />
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Hunt QR Stickers
          </h2>
          <p className="text-xs text-[#CFCBDD]">
            Print all 10 static QR stickers (place names stay hidden on the
            sticker face).
          </p>
        </Link>

        {isVolunteer && (
          <Link
            href="/staff/winners/"
            className="rounded-[22px] border-[1.5px] border-[#22D3EE] bg-[#1F1230] p-5 space-y-2"
          >
            <Trophy className="size-7 text-[#FFE14D]" />
            <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
              Prize Desk · Winners
            </h2>
            <p className="text-xs text-[#CFCBDD]">
              View top hunters&apos; emails, scores, and completion times to spot
              cheating.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
