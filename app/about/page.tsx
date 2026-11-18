import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Radio } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';

export const metadata: Metadata = {
  title: 'About',
  description: `About ${festName} Live at ${collegeName}.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`About ${festName} Live`}
        subtitle={collegeName}
      />

      <Card>
        <CardContent className="space-y-3 pt-4 text-sm leading-relaxed text-foreground/90">
          <p>
            <strong>{festName} Live</strong> is the official real-time campus
            guide for {festName}. See what is happening right now, what starts
            next, where every venue is, and live scores without hunting across
            posters or WhatsApp groups.
          </p>
          <p>
            Sign in with your Google account to star events into your personal
            schedule and post <strong>Signals</strong> to find hackathon
            teammates or connect with builders on campus.
          </p>
          <p className="text-muted-foreground">
            Built by students for {collegeName} — lightweight, mobile-first, and
            fast even on crowded campus Wi-Fi.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-brand" aria-hidden="true" />
            Fest Committee Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Spot a schedule change, wrong room, or urgent issue? Reach out to
            the {festName} organising committee at the campus help desk or via
            your club coordinator.
          </p>
          <div className="flex flex-col gap-1.5 text-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Help Desk, Main Entrance — {collegeName}
            </span>
            <span className="inline-flex items-center gap-2">
              <Radio className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Website:{' '}
              <a
                href="https://sdmcet.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand underline underline-offset-4"
              >
                sdmcet.ac.in
              </a>
            </span>
          </div>
          <div className="pt-2 flex flex-wrap gap-2">
            <Link
              href="/schedule"
              className={cn(buttonVariants({ variant: 'default' }), 'min-h-11 px-4')}
            >
              Browse schedule
            </Link>
            <Link
              href="/announcements"
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 px-4')}
            >
              Latest announcements
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
