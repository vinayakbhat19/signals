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

export const CATEGORY_STYLES: Record<EventCategory, string> = {
  tech: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800/70',
  cultural:
    'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-800/70',
  sports:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800/70',
  workshop:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-800/70',
  talk: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800/70',
  fun: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800/70',
  official:
    'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
};

interface CategoryChipProps {
  category: EventCategory;
  className?: string;
}

export function CategoryChip({ category, className }: CategoryChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-tight',
        CATEGORY_STYLES[category],
        className
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
