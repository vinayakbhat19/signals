import { cn } from '@/lib/utils';
import type { EventStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: 'On time',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800/70',
  },
  delayed: {
    label: 'Delayed',
    className:
      'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800',
  },
  done: {
    label: 'Done',
    className:
      'bg-muted text-muted-foreground border-border',
  },
};

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-tight',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
