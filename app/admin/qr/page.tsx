import { AdminQrClient } from '@/components/admin-qr-client';
import { requireOrganiser } from '@/lib/auth';
import { listEvents } from '@/lib/data/events';
import { listVenues } from '@/lib/data/venues';
import { formatDay, formatRange } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function AdminQrPage() {
  await requireOrganiser();
  const [events, venues] = await Promise.all([listEvents(), listVenues()]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return (
    <AdminQrClient
      siteUrl={siteUrl}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        subtitle: `${formatDay(e.starts_at)} · ${formatRange(e.starts_at, e.ends_at)}${e.venue_name ? ` · ${e.venue_name}` : ''}`,
      }))}
      venues={venues.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
      }))}
    />
  );
}
