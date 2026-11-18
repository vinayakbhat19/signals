'use client';

import Link from 'next/link';
import { ExternalLink, MapPin } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';

export default function VenuesPage() {
  const { feed } = useLiveFeed();

  return (
    <div className="space-y-5">
      <header className="pt-1 space-y-1">
        <h1 className="font-display text-3xl text-[#F4F2FA] sm:text-4xl">
          CAMPUS VENUES
        </h1>
        <p className="text-xs text-[#9C97B0]">
          SDM College of Engineering &amp; Technology, Dharwad
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {feed.venues.map((v) => {
          const count = feed.events.filter((e) => e.venue_id === v.id).length;
          return (
            <div
              key={v.id}
              className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3"
            >
              <Link href={`/venue/?id=${v.id}`} className="block space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA] hover:text-[#FFD60A]">
                    {v.name}
                  </h2>
                  <span className="rounded-full bg-[#2A1840] px-2.5 py-0.5 text-[11px] font-bold text-[#FFD60A]">
                    {count} {count === 1 ? 'event' : 'events'}
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href={`/venue/?id=${v.id}`}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#3B2758] bg-[#12091E] text-xs font-bold text-[#F4F2FA] hover:border-[#FFD60A]"
                >
                  View schedule
                </Link>
                {v.maps_url && (
                  <a
                    href={v.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
                  >
                    <MapPin className="size-3.5" />
                    Maps
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
