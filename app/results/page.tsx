import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';
import { CategoryChip } from '@/components/category-chip';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listResults, type ResultWithEvent } from '@/lib/data/results';
import { formatTime, formatTimeAgo } from '@/lib/time';
import type { EventCategory } from '@/lib/types';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Results',
  description: 'Winners, standings, and live match scores across fest events.',
};

interface GroupedResult {
  eventId: string;
  eventTitle: string;
  eventCategory: EventCategory | null;
  hasLive: boolean;
  items: ResultWithEvent[];
}

export default async function ResultsPage() {
  let results: ResultWithEvent[] = [];
  try {
    results = await listResults();
  } catch (error) {
    console.error('[app/results] Failed to load results:', error);
  }

  const grouped = new Map<string, GroupedResult>();
  for (const item of results) {
    const existing = grouped.get(item.event_id);
    if (existing) {
      existing.items.push(item);
      if (item.is_live) existing.hasLive = true;
    } else {
      grouped.set(item.event_id, {
        eventId: item.event_id,
        eventTitle: item.event_title,
        eventCategory: item.event_category,
        hasLive: item.is_live,
        items: [item],
      });
    }
  }

  const eventGroups = Array.from(grouped.values()).sort(
    (a, b) => Number(b.hasLive) - Number(a.hasLive)
  );

  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Results & Live Scores"
        subtitle="Winners and live match updates from fest events."
      />

      {eventGroups.length > 0 ? (
        <div className="space-y-4">
          {eventGroups.map((group) => (
            <Card key={group.eventId}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {group.hasLive && (
                        <Badge variant="destructive" className="gap-1.5 text-[11px]">
                          <span className="size-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </Badge>
                      )}
                      {group.eventCategory && (
                        <CategoryChip category={group.eventCategory} />
                      )}
                    </div>
                    <CardTitle className="text-lg">
                      <Link
                        href={`/events/${group.eventId}`}
                        className="hover:text-brand transition-colors"
                      >
                        {group.eventTitle}
                      </Link>
                    </CardTitle>
                  </div>

                  <Link
                    href={`/events/${group.eventId}`}
                    className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-brand hover:underline underline-offset-4"
                  >
                    Event
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {group.items.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-lg border bg-muted/30 p-3.5 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {result.title}
                      </h3>
                      <span
                        className="text-xs text-muted-foreground"
                        title={`${formatTime(result.updated_at)} IST`}
                      >
                        Updated {formatTimeAgo(result.updated_at, now)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {result.body}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Trophy className="size-5" aria-hidden="true" />}
          title="No results posted yet"
          description="Live scores and winners will show up here as soon as organisers publish them."
          actionLabel="View schedule"
          actionHref="/schedule"
        />
      )}
    </div>
  );
}
