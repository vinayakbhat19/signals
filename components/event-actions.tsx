'use client';

import Link from 'next/link';
import { CalendarPlus, Radio, Share2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EventActionsProps {
  eventId: string;
  eventTitle: string;
  shareText: string;
  googleCalendarUrl: string;
}

export function EventActions({
  eventId,
  eventTitle,
  shareText,
  googleCalendarUrl,
}: EventActionsProps) {
  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Event link copied to clipboard');
    } catch {
      toast.error('Could not copy link. Copy it from your browser address bar.');
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Button
        type="button"
        variant="outline"
        disabled
        title="Starring unlocks in Phase 4"
        className="min-h-11 gap-2 px-4 opacity-60"
      >
        <Star className="size-4" aria-hidden="true" />
        Star event
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleShare}
        className="min-h-11 gap-2 px-4"
      >
        <Share2 className="size-4" aria-hidden="true" />
        Share
      </Button>

      <a
        href={googleCalendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'min-h-11 gap-2 px-4'
        )}
      >
        <CalendarPlus className="size-4" aria-hidden="true" />
        Add to Google Calendar
      </a>

      <Link
        href={`/signals/new?event=${eventId}`}
        className={cn(
          buttonVariants({ variant: 'default' }),
          'min-h-11 gap-2 px-4'
        )}
      >
        <Radio className="size-4" aria-hidden="true" />
        Raise a Signal for this event
      </Link>
    </div>
  );
}
