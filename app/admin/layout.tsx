import Link from 'next/link';
import {
  BarChart3,
  CalendarCog,
  Compass,
  FileSpreadsheet,
  QrCode,
  ShieldAlert,
  Users,
  Vote,
} from 'lucide-react';
import { requireOrganiser } from '@/lib/auth';

const ADMIN_TABS = [
  { href: '/admin', label: 'Control Room', icon: CalendarCog },
  { href: '/admin/import', label: 'Import CSV', icon: FileSpreadsheet },
  { href: '/admin/hosts', label: 'Hosts & Staff', icon: Users },
  { href: '/admin/hunt', label: 'Treasure Hunt', icon: Compass },
  { href: '/admin/voting', label: 'Voting', icon: Vote },
  { href: '/admin/qr', label: 'QR Posters', icon: QrCode },
  { href: '/admin/safety', label: 'Safety', icon: ShieldAlert },
  { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireOrganiser();

  return (
    <div className="space-y-5">
      <div className="space-y-3 border-b border-[#3B2758] pb-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FF4FD8]">
              ORGANISER CONTROL ROOM · {profile.role.toUpperCase()}
            </span>
            <h1 className="font-display text-2xl text-[#F4F2FA] sm:text-3xl">
              FIESTA&apos;26 ADMIN
            </h1>
          </div>
          <Link
            href="/events"
            className="inline-flex h-10 items-center rounded-xl border border-[#3B2758] bg-[#1F1230] px-3.5 text-xs font-bold text-[#FFD60A]"
          >
            View public app →
          </Link>
        </div>

        <nav
          aria-label="Organiser tools"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#1F1230] px-3.5 text-xs font-extrabold text-[#F4F2FA] hover:border-[#FFD60A] hover:text-[#FFD60A]"
              >
                <Icon className="size-4" aria-hidden="true" />
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
