import { Skeleton } from '@/components/ui/skeleton';

export function EventCardSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3.5">
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="size-10 shrink-0 rounded-lg" />
    </div>
  );
}

export function EventListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading events">
      {Array.from({ length: count }).map((_, idx) => (
        <EventCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function AnnouncementListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading announcements">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function VenueListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      aria-label="Loading venues"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2.5 rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
