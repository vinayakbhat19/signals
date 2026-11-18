'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';
import { formatDay, formatRange } from '@/lib/time';

function VenueInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { feed } = useLiveFeed();

  const venue = feed.venues.find((v) => v.id === id) ?? null;
  const events = feed.events.filter((e) => e.venue_id === id);

  if (!venue) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
          Venue not found
        </p>
        <Link
          href="/venues/"
          className="inline-flex h-10 items-center rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]"
        >
          All venues
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/venues/"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#FF9F43]">
              CAMPUS VENUE
            </p>
            <h1 className="font-display text-2xl text-[#F4F2FA]">
              {venue.name}
            </h1>
          </div>
        </div>
        {venue.maps_url && (
          <a
            href={venue.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
          >
            <MapPin className="size-4" />
            Directions
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <div className="space-y-2.5">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/event/?id=${ev.id}`}
            className="block rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4 hover:border-[#FFD60A]"
          >
            <p className="font-heading text-base font-extrabold text-[#F4F2FA]">
              {ev.title}
            </p>
            <p className="text-xs text-[#BDB8CF]">
              {formatDay(ev.starts_at)} · {formatRange(ev.starts_at, ev.ends_at)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function VenueDetailPage() {
  return (
    <Suspense fallback={null}>
      <VenueInner />
    </Suspense>
  );
}
