import { HomeLiveFeed } from '@/components/home-live-feed';
import { getLiveData, type LiveData } from '@/lib/data/live';
import { readWithFallback } from '@/lib/resilience';

export const revalidate = 30;

const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';

export default async function HomePage() {
  const fallback: LiveData = {
    now: [],
    next: [],
    announcements: [],
    urgent: null,
    changes: [],
    changedEventIds: [],
    serverTime: new Date().toISOString(),
  };

  const { data: initialData } = await readWithFallback(
    'page:home',
    () => getLiveData(),
    fallback,
    3000
  );

  return <HomeLiveFeed festName={festName} initialData={initialData} />;
}
