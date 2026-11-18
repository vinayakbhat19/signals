import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Megaphone } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import {
  listAnnouncements,
  type AnnouncementWithEvent,
} from '@/lib/data/announcements';
import { readWithFallback } from '@/lib/resilience';
import { formatDay, formatTime, formatTimeAgo } from '@/lib/time';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Announcements',
  description:
    'Latest official announcements and urgent updates from the fest committee.',
};

export default async function AnnouncementsPage() {
  const { data: announcements } = await readWithFallback<
    AnnouncementWithEvent[]
  >('page:announcements', () => listAnnouncements(), [], 3000);

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Updates"
        subtitle="Official announcements from the fest committee, newest first."
      />

      {announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((item) => {
            const isUrgent = item.priority === 'urgent';
            return (
              <article
                key={item.id}
                className={
                  isUrgent
                    ? 'rounded-[22px] border-2 border-[#FF4FA3] bg-[#16141F] p-4 shadow-[4px_4px_0_#C6FF3D]'
                    : 'rounded-[20px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-4'
                }
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9C97B0]">
                  <div className="flex items-center gap-2">
                    {isUrgent ? (
                      <span className="rounded-full bg-[#FF4FA3] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0A12]">
                        URGENT
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#24212F] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#CFCBDD]">
                        UPDATE
                      </span>
                    )}
                    <span
                      title={`${formatDay(item.created_at)} · ${formatTime(item.created_at)} IST`}
                    >
                      {formatTimeAgo(item.created_at, now)}
                    </span>
                  </div>
                  <span>{formatTime(item.created_at)} IST</span>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed text-[#F4F2FA]">
                  {item.message}
                </p>

                {item.event_id && (
                  <div className="mt-3">
                    <Link
                      href={`/events/${item.event_id}`}
                      className="inline-flex min-h-9 items-center gap-1 text-xs font-extrabold text-[#C6FF3D] hover:underline underline-offset-4"
                    >
                      {item.event_title ?? 'View linked event'}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Megaphone className="size-5" aria-hidden="true" />}
          title="No updates yet"
          description="Schedule changes, room moves, and committee alerts will appear here."
          actionLabel="Browse events"
          actionHref="/events"
        />
      )}
    </div>
  );
}
