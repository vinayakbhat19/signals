import { AdminDashboardClient } from '@/components/admin-dashboard-client';
import { requireOrganiser } from '@/lib/auth';
import { listAnnouncements } from '@/lib/data/announcements';
import { listEvents } from '@/lib/data/events';
import { listResults } from '@/lib/data/results';
import { listVenues } from '@/lib/data/venues';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireOrganiser();
  const [events, venues, announcements, results] = await Promise.all([
    listEvents(),
    listVenues(),
    listAnnouncements(),
    listResults(),
  ]);

  return (
    <AdminDashboardClient
      events={events}
      venues={venues}
      announcements={announcements}
      results={results}
    />
  );
}
