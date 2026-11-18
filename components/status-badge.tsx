import { cn } from '@/lib/utils';
import type { EventStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: 'On time',
    className: 'bg-[#2A1840] text-[#CFCBDD] border-[#3A3549]',
  },
  delayed: {
    label: 'Delayed',
    className: 'bg-[#FF9F43] text-[#12091E] border-transparent',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#FF4FD8]/20 text-[#FF4FD8] border-[#FF4FD8]/40',
  },
  done: {
    label: 'Done',
    className: 'bg-[#3A3549] text-[#F4F2FA] border-transparent',
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
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] leading-tight',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
