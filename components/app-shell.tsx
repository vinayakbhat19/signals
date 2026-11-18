'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Home,
  Info,
  MapPin,
  Megaphone,
  Menu,
  Radio,
  ShieldCheck,
  Star,
  Trophy,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const PRIMARY_TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/signals', label: 'Signals', icon: Radio },
  { href: '/my', label: 'My', icon: Star },
] as const;

const MORE_LINKS = [
  {
    href: '/venues',
    label: 'Venues',
    description: 'Campus locations & maps',
    icon: MapPin,
  },
  {
    href: '/announcements',
    label: 'Announcements',
    description: 'Live committee updates',
    icon: Megaphone,
  },
  {
    href: '/results',
    label: 'Results',
    description: 'Winners & live scores',
    icon: Trophy,
  },
  {
    href: '/about',
    label: 'About',
    description: 'About this app & committee contact',
    icon: Info,
  },
] as const;

interface AppShellProps {
  festName: string;
  collegeName: string;
  /** Will be gated by user role in Phase 3; defaults to true as a placeholder link for now */
  showAdminLink?: boolean;
  /** Optional right-side header slot (avatar menu plugs in during Phase 3) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  festName,
  collegeName,
  showAdminLink = true,
  headerRight,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive =
    MORE_LINKS.some((item) => isRouteActive(pathname, item.href)) ||
    isRouteActive(pathname, '/admin');

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Sticky top header: compact on mobile, full navigation on desktop (>= 1024px) */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80 print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground shadow-xs"
              aria-hidden="true"
            >
              {festName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="block truncate text-base font-bold leading-none tracking-tight">
                {festName}
              </span>
              <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block max-w-[220px]">
                {collegeName}
              </span>
            </div>
          </Link>

          {/* Desktop top navigation (>= 1024px) */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-1"
          >
            {[
              ...PRIMARY_TABS.map(({ href, label }) => ({ href, label })),
              ...MORE_LINKS.map(({ href, label }) => ({ href, label })),
              ...(showAdminLink
                ? [{ href: '/admin', label: 'Organiser' }]
                : []),
            ].map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {headerRight && (
            <div className="flex shrink-0 items-center">{headerRight}</div>
          )}
        </div>
      </header>

      {/* Main page content — extra bottom padding on mobile for fixed bottom tab bar */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 lg:pb-10">
        {children}
      </main>

      {/* Mobile bottom tab bar (< 1024px) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/85 lg:hidden print:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isRouteActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'text-brand font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon
                  className={cn('size-5', active && 'stroke-[2.25]')}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              aria-label="More navigation links"
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer',
                isMoreActive || moreOpen
                  ? 'text-brand font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Menu
                className={cn(
                  'size-5',
                  (isMoreActive || moreOpen) && 'stroke-[2.25]'
                )}
                aria-hidden="true"
              />
              <span>More</span>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="text-left pb-2">
                <SheetTitle>{festName}</SheetTitle>
                <SheetDescription>{collegeName}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 pb-2">
                {MORE_LINKS.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                        active
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-5 shrink-0',
                          active ? 'text-brand' : 'text-muted-foreground'
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight">
                          {item.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {showAdminLink && (
                  <Link
                    href="/admin"
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'mt-1 flex min-h-12 items-center gap-3 rounded-xl border-t pt-3 px-3 py-2.5 transition-colors',
                      isRouteActive(pathname, '/admin')
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <ShieldCheck
                      className={cn(
                        'size-5 shrink-0',
                        isRouteActive(pathname, '/admin')
                          ? 'text-brand'
                          : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">
                        Organiser panel
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Manage events, updates & QR codes
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
