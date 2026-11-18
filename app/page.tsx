import { HomeLiveFeed } from '@/components/home-live-feed';
import { getLiveData, type LiveData } from '@/lib/data/live';

export const revalidate = 30;

const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';

export default async function HomePage() {
  let initialData: LiveData;

  try {
    initialData = await getLiveData();
  } catch (error) {
    console.error('[app/page] Failed to load initial live data:', error);
    initialData = {
      now: [],
      next: [],
      announcements: [],
      urgent: null,
      serverTime: new Date().toISOString(),
    };
  }

  return (
    <HomeLiveFeed
      festName={festName}
      collegeName={collegeName}
      initialData={initialData}
    />
  );
}
