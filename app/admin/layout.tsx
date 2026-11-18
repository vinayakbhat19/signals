'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarCog,
  Compass,
  FileSpreadsheet,
  Loader2,
  QrCode,
  ShieldAlert,
  Users,
  Vote,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';

const ADMIN_TABS = [
  { href: '/admin/', label: 'Control Room', icon: CalendarCog },
  { href: '/admin/import/', label: 'Import CSV', icon: FileSpreadsheet },
  { href: '/admin/hosts/', label: 'Hosts & Staff', icon: Users },
  { href: '/admin/hunt/', label: 'Treasure Hunt', icon: Compass },
  { href: '/admin/voting/', label: 'Voting', icon: Vote },
  { href: '/admin/qr/', label: 'QR Posters', icon: QrCode },
  { href: '/admin/safety/', label: 'Safety', icon: ShieldAlert },
  { href: '/admin/stats/', label: 'Stats', icon: BarChart3 },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isOrganiser, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <ShieldAlert className="mx-auto size-10 text-[#FFD60A]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">
          ORGANISER SIGN IN
        </h1>
        <p className="text-sm text-[#BDB8CF]">
          Please sign in with your Fiesta&apos;26 organiser or admin account to
          access the Control Room.
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/login/?next=/admin/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#FFD60A] px-6 text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8]"
          >
            Log in
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] px-5 text-sm font-bold text-[#F4F2FA]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!isOrganiser) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">
          ACCESS RESTRICTED
        </h1>
        <p className="text-sm text-[#9C97B0]">
          This area is only available to Fiesta&apos;26 organisers and admins.
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
    <div className="space-y-5">
      <div className="space-y-3 border-b border-[#3B2758] pb-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FF4FD8]">
              ORGANISER CONTROL ROOM · {(profile?.role || 'organiser').toUpperCase()}
            </span>
            <h1 className="font-display text-2xl text-[#F4F2FA] sm:text-3xl">
              FIESTA&apos;26 ADMIN
            </h1>
          </div>
          <Link
            href="/events/"
            className="inline-flex h-10 items-center rounded-xl border border-[#3B2758] bg-[#1F1230] px-3.5 text-xs font-bold text-[#FFD60A]"
          >
            View public app →
          </Link>
        </div>

        <nav className="flex items-center gap-2 overflow-x-auto pb-1">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#1F1230] px-3.5 text-xs font-extrabold text-[#F4F2FA] hover:border-[#FFD60A] hover:text-[#FFD60A]"
              >
                <Icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
