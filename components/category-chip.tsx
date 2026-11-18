import { cn } from '@/lib/utils';
import type { EventCategory } from '@/lib/types';

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  tech: 'Tech',
  cultural: 'Cultural',
  sports: 'Sports',
  workshop: 'Workshop',
  talk: 'Talk',
  fun: 'Fun',
  official: 'Official',
};

/** Exact Neon Night solid category colors */
export const CATEGORY_DOT_COLOR: Record<EventCategory, string> = {
  tech: '#22D3EE',
  cultural: '#FF4FD8',
  sports: '#FFD60A',
  workshop: '#FF9F43',
  talk: '#9B6CFF',
  fun: '#FFE14D',
  official: '#9C97B0',
};

export const CATEGORY_STYLES: Record<EventCategory, string> = {
  tech: 'bg-[#22D3EE] text-[#12091E] border-transparent',
  cultural: 'bg-[#FF4FD8] text-[#12091E] border-transparent',
  sports: 'bg-[#FFD60A] text-[#12091E] border-transparent',
  workshop: 'bg-[#FF9F43] text-[#12091E] border-transparent',
  talk: 'bg-[#9B6CFF] text-[#12091E] border-transparent',
  fun: 'bg-[#FFE14D] text-[#12091E] border-transparent',
  official: 'bg-[#3A3549] text-[#F4F2FA] border-transparent',
};

interface CategoryChipProps {
  category: EventCategory;
  className?: string;
}

export function CategoryChip({ category, className }: CategoryChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] leading-tight',
        CATEGORY_STYLES[category],
        className
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
