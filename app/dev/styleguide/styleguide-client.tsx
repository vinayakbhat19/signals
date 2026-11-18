'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EventCard, type EventCardData } from '@/components/event-card';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

interface StyleguideInteractiveProps {
  sampleEvents: EventCardData[];
}

export function StyleguideInteractive({
  sampleEvents,
}: StyleguideInteractiveProps) {
  const [starredIds, setStarredIds] = useState<string[]>([sampleEvents[0]?.id ?? '']);

  function toggleStar(id: string) {
    setStarredIds((prev) => {
      const exists = prev.includes(id);
      toast(exists ? 'Removed from My Schedule (demo)' : 'Added to My Schedule (demo)');
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">EventCard (all states)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <EventCard
            event={sampleEvents[0]}
            live
            timeNote="ends 6:00 PM"
            starred={starredIds.includes(sampleEvents[0].id)}
            onToggleStar={toggleStar}
            href="#live"
          />
          <EventCard
            event={sampleEvents[1]}
            timeNote="in 25 min"
            starred={starredIds.includes(sampleEvents[1].id)}
            onToggleStar={toggleStar}
            href="#delayed"
          />
          <EventCard
            event={sampleEvents[2]}
            starred={starredIds.includes(sampleEvents[2].id)}
            onToggleStar={toggleStar}
            href="#cancelled"
          />
          <EventCard
            event={sampleEvents[3]}
            showScheduledStatus
            starred={starredIds.includes(sampleEvents[3].id)}
            onToggleStar={toggleStar}
            href="#done"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ErrorState & Toast</h2>
        <ErrorState
          title="Could not refresh live schedule"
          message="Your network dropped for a moment. Showing cached data—tap below to retry."
          onRetry={() => toast.success('Retried successfully (demo)')}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11 px-4"
            onClick={() => toast.success('Event delayed by 15 min')}
          >
            Trigger success toast
          </Button>
          <Button
            variant="outline"
            className="min-h-11 px-4"
            onClick={() => toast.error('Could not save changes')}
          >
            Trigger error toast
          </Button>
        </div>
      </section>
    </div>
  );
}
