'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Home,
  QrCode,
  Stamp,
  Vote,
} from 'lucide-react';
import { AccountAvatar } from '@/components/account-avatar';
import { AddToHomeBar } from '@/components/add-to-home-bar';
import { CookieSheet } from '@/components/cookie-sheet';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

const CHROMELESS_PREFIXES = [
  '/welcome',
  '/login',
  '/signup',
  '/reset',
  '/verified',
  '/scan',
  '/stamp/',
  '/hunt/board',
  '/screen/',
  '/signals',
  '/admin/qr/print',
  '/admin/station/',
];

const DESKTOP_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/scan', label: 'Scan' },
  { href: '/vote', label: 'Vote' },
  { href: '/hunt', label: 'Hunt' },
  { href: '/signals', label: 'Signals' },
  { href: '/venues', label: 'Venues' },
  { href: '/results', label: 'Results' },
  { href: '/updates', label: 'Updates' },
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
  const { isOrganiser, isHost, isVolunteer } = useAuth();
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isChromeless) {
    return (
      <div className="min-h-dvh bg-[#12091E] text-[#F4F2FA]">{children}</div>
    );
  }

  const isEventDetail =
    pathname.startsWith('/events/') && !pathname.endsWith('/line-up');

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-[#12091E] text-[#F4F2FA]">
      {/* Desktop top navigation (>= 1024px) with Fiesta'26 halftone band */}
      <header className="halftone-band sticky top-0 z-40 hidden border-b border-[#3B2758] lg:block print:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <Link href="/" title={collegeName} className="flex items-center gap-2.5">
            <Image
              src="/brand/fiesta26-logo.png"
              alt={festName}
              width={108}
              height={42}
              className="h-10 w-auto object-contain"
              priority
            />
            <span className="-rotate-3 rounded-lg bg-[#FFD60A] px-2 py-0.5 font-heading text-xs font-extrabold tracking-wider text-[#12091E]">
              LIVE
            </span>
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
                      ? 'bg-[#FFD60A] text-[#12091E] font-extrabold'
                      : 'text-[#BDB8CF] hover:bg-[#1F1230] hover:text-[#F4F2FA]'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {isOrganiser ? (
              <Link
                href="/admin/"
                aria-current={isRouteActive(pathname, '/admin') ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                  isRouteActive(pathname, '/admin')
                    ? 'bg-[#FF4FD8] text-[#12091E] font-extrabold'
                    : 'text-[#FFD60A] hover:bg-[#1F1230]'
                )}
              >
                Admin
              </Link>
            ) : isHost ? (
              <Link
                href="/host/"
                aria-current={isRouteActive(pathname, '/host') ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                  isRouteActive(pathname, '/host')
                    ? 'bg-[#FF4FD8] text-[#12091E] font-extrabold'
                    : 'text-[#FFD60A] hover:bg-[#1F1230]'
                )}
              >
                Host
              </Link>
            ) : isVolunteer ? (
              <Link
                href="/volunteer/"
                aria-current={isRouteActive(pathname, '/volunteer') ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors',
                  isRouteActive(pathname, '/volunteer')
                    ? 'bg-[#FF4FD8] text-[#12091E] font-extrabold'
                    : 'text-[#FFD60A] hover:bg-[#1F1230]'
                )}
              >
                Volunteer
              </Link>
            ) : null}
          </nav>

          <AccountAvatar size="sm" />
        </div>
      </header>

      {/* Main page content */}
      <main
        className={cn(
          'mx-auto w-full flex-1',
          isEventDetail
            ? 'max-w-3xl pb-36 lg:pb-12'
            : pathname === '/'
              ? 'max-w-5xl px-4 pb-44 lg:px-5 lg:pt-6 lg:pb-12'
              : 'max-w-5xl px-4 pt-3 pb-44 lg:px-5 lg:pt-6 lg:pb-12'
        )}
      >
        {children}
      </main>

      {/* Floating Add to Home Screen bar (mobile browser visits only) */}
      <AddToHomeBar />
      <CookieSheet />

      {/* Mobile floating Neon Night bottom bar (< 1024px) */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3.5 z-40 mx-auto grid h-[68px] max-w-lg grid-cols-5 rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230]/95 p-1.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.65)] lg:hidden print:hidden"
      >
        <Link
          href="/"
          aria-current={isRouteActive(pathname, '/') ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] transition-colors',
            isRouteActive(pathname, '/')
              ? 'bg-[#FFD60A] font-extrabold text-[#12091E]'
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
              ? 'bg-[#FFD60A] font-extrabold text-[#12091E]'
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
          <span className="-mt-7 flex size-[62px] flex-col items-center justify-center gap-0.5 rounded-[22px] border-4 border-[#12091E] bg-[#FFD60A] text-[10px] font-extrabold tracking-[0.06em] text-[#12091E] shadow-[4px_4px_0_#FF4FD8] active:translate-y-0.5 transition-transform">
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
              ? 'bg-[#FFD60A] font-extrabold text-[#12091E]'
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
              ? 'bg-[#FFD60A] font-extrabold text-[#12091E]'
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
