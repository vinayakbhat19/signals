'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Home,
  QrCode,
  Stamp,
  Vote,
} from 'lucide-react';
import { AddToHomeBar } from '@/components/add-to-home-bar';
import { AlienMascot } from '@/components/mascots';
import { cn } from '@/lib/utils';

const CHROMELESS_PREFIXES = [
  '/welcome',
  '/login',
  '/signup',
  '/reset',
  '/verified',
  '/screen/',
  '/admin/qr/print',
  '/admin/station/',
];

const DESKTOP_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/scan', label: 'Scan' },
  { href: '/vote', label: 'Vote' },
  { href: '/hunt', label: 'Hunt' },
  { href: '/venues', label: 'Venues' },
  { href: '/results', label: 'Results' },
  { href: '/updates', label: 'Updates' },
  { href: '/admin', label: 'Organiser' },
] as const;

interface AppShellProps {
  festName: string;
  collegeName: string;
  children: React.ReactNode;
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/events') {
    return (
      pathname === '/events' ||
      pathname.startsWith('/events/') ||
      pathname === '/schedule'
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  festName,
  collegeName,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isChromeless) {
    return (
      <div className="min-h-dvh bg-[#0B0A12] text-[#F4F2FA]">{children}</div>
    );
  }

  const isEventDetail =
    pathname.startsWith('/events/') && !pathname.endsWith('/line-up');

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0A12] text-[#F4F2FA]">
      {/* Desktop top navigation (>= 1024px) */}
      <header className="sticky top-0 z-40 hidden border-b border-[#2E2A3D] bg-[#0B0A12]/95 backdrop-blur-sm lg:block print:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <AlienMascot size={36} />
            <div className="flex flex-col">
              <span className="font-heading text-[22px] font-extrabold leading-none tracking-[-0.03em] text-[#F4F2FA]">
                fest<span className="text-[#C6FF3D]">.</span>live
              </span>
              <span className="mt-0.5 text-[11px] text-[#9C97B0] truncate max-w-[240px]">
                {festName} · {collegeName}
              </span>
            </div>
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1">
            {DESKTOP_LINKS.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-[#C6FF3D] text-[#0B0A12] font-extrabold'
                      : 'text-[#BDB8CF] hover:bg-[#16141F] hover:text-[#F4F2FA]'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/account"
            aria-label="My account"
            className="flex size-10 items-center justify-center rounded-[13px] bg-[#FF4FA3] text-sm font-extrabold text-[#0B0A12] rotate-3 hover:rotate-0 transition-transform"
          >
            ME
          </Link>
        </div>
      </header>

      {/* Main page content */}
      <main
        className={cn(
          'mx-auto w-full flex-1',
          isEventDetail
            ? 'max-w-3xl pb-36 lg:pb-12'
            : 'max-w-5xl px-4 pt-3 pb-44 lg:px-5 lg:pt-6 lg:pb-12'
        )}
      >
        {children}
      </main>

      {/* Floating Add to Home Screen bar (mobile browser visits only) */}
      <AddToHomeBar />

      {/* Mobile floating Neon Night bottom bar (< 1024px) */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3.5 z-40 mx-auto grid h-[68px] max-w-lg grid-cols-5 rounded-[24px] border-[1.5px] border-[#2E2A3D] bg-[#16141F]/95 p-1.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.65)] lg:hidden print:hidden"
      >
        <Link
          href="/"
          aria-current={isRouteActive(pathname, '/') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] transition-colors',
            isRouteActive(pathname, '/')
              ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
              : 'font-semibold text-[#9C97B0] hover:text-[#F4F2FA]'
          )}
        >
          <Home className="size-[21px]" aria-hidden="true" />
          <span>Home</span>
        </Link>

        <Link
          href="/events"
          aria-current={isRouteActive(pathname, '/events') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] transition-colors',
            isRouteActive(pathname, '/events')
              ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
              : 'font-semibold text-[#9C97B0] hover:text-[#F4F2FA]'
          )}
        >
          <CalendarDays className="size-[21px]" aria-hidden="true" />
          <span>Events</span>
        </Link>

        {/* Raised SCAN center button */}
        <Link
          href="/scan"
          aria-label="Scan a QR"
          aria-current={isRouteActive(pathname, '/scan') ? 'page' : undefined}
          className="flex items-center justify-center"
        >
          <span className="-mt-7 flex size-[62px] flex-col items-center justify-center gap-0.5 rounded-[22px] border-4 border-[#0B0A12] bg-[#C6FF3D] text-[10px] font-extrabold tracking-[0.06em] text-[#0B0A12] shadow-[4px_4px_0_#FF4FA3] active:translate-y-0.5 transition-transform">
            <QrCode className="size-6 stroke-[2.4]" aria-hidden="true" />
            SCAN
          </span>
        </Link>

        <Link
          href="/vote"
          aria-current={isRouteActive(pathname, '/vote') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] transition-colors',
            isRouteActive(pathname, '/vote')
              ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
              : 'font-semibold text-[#9C97B0] hover:text-[#F4F2FA]'
          )}
        >
          <Vote className="size-[21px]" aria-hidden="true" />
          <span>Vote</span>
        </Link>

        <Link
          href="/hunt"
          aria-current={isRouteActive(pathname, '/hunt') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] transition-colors',
            isRouteActive(pathname, '/hunt')
              ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
              : 'font-semibold text-[#9C97B0] hover:text-[#F4F2FA]'
          )}
        >
          <Stamp className="size-[21px]" aria-hidden="true" />
          <span>Hunt</span>
        </Link>
      </nav>
    </div>
  );
}
