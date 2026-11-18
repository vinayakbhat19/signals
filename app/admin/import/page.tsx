import { AdminImportClient } from '@/components/admin-import-client';
import { requireOrganiser } from '@/lib/auth';
import { listEvents } from '@/lib/data/events';

export const dynamic = 'force-dynamic';

export default async function AdminImportPage() {
  await requireOrganiser();
  const events = await listEvents();
  const existingCodes = events
    .map((e) => e.code)
    .filter((c): c is string => Boolean(c));

  return <AdminImportClient existingCodes={existingCodes} />;
}
