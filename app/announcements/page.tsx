import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Megaphone } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import {
  listAnnouncements,
  type AnnouncementWithEvent,
} from '@/lib/data/announcements';
import { formatDay, formatTime, formatTimeAgo } from '@/lib/time';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Latest official announcements and urgent updates from the fest committee.',
};

export default async function AnnouncementsPage() {
  let announcements: AnnouncementWithEvent[] = [];
  try {
    announcements = await listAnnouncements();
  } catch (error) {
    console.error('[app/announcements] Failed to load announcements:', error);
  }

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Official updates from the fest committee, newest first."
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
                    ? 'rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-card-foreground shadow-xs dark:border-amber-800 dark:bg-amber-950/40'
                    : 'rounded-xl border bg-card p-4 text-card-foreground shadow-xs'
                }
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {isUrgent ? (
                      <Badge variant="destructive" className="text-[11px]">
                        Urgent
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">
                        Update
                      </Badge>
                    )}
                    <span title={`${formatDay(item.created_at)} · ${formatTime(item.created_at)} IST`}>
                      {formatTimeAgo(item.created_at, now)}
                    </span>
                  </div>
                  <span>{formatTime(item.created_at)} IST</span>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {item.message}
                </p>

                {item.event_id && (
                  <div className="mt-3">
                    <Link
                      href={`/events/${item.event_id}`}
                      className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-brand hover:underline underline-offset-4"
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
          title="No announcements yet"
          description="Schedule changes, room updates, and committee alerts will appear here."
          actionLabel="View schedule"
          actionHref="/schedule"
        />
      )}
    </div>
  );
}
