'use client';

import Link from 'next/link';
import { Vote } from 'lucide-react';
import { useLiveFeed } from '@/lib/live-store';

export default function AdminVotingPage() {
  const { feed } = useLiveFeed();
  const openEventIds = new Set(feed.polls.map((p) => p.event_id));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-[#F4F2FA]">
          AUDIENCE VOTING CONTROLS
        </h2>
        <p className="text-xs text-[#9C97B0]">
          Open any competition below to add contestants, turn voting ON/OFF, or
          switch result visibility.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {feed.events.map((ev) => {
          const isOpen = openEventIds.has(ev.id);
          return (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-4"
            >
              <div className="min-w-0">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isOpen
                      ? 'bg-[#FF4FD8] text-[#12091E]'
                      : 'bg-[#2A1840] text-[#9C97B0]'
                  }`}
                >
                  {isOpen ? 'OPEN' : 'OFF'}
                </span>
                <p className="mt-1 truncate font-heading text-base font-extrabold text-[#F4F2FA]">
                  {ev.title}
                </p>
              </div>
              <Link
                href={`/host/voting/?id=${ev.id}`}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]"
              >
                <Vote className="size-3.5" />
                Manage
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
