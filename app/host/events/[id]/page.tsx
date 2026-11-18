import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import {
  HostEventEditorClient,
  type HostEditableEvent,
} from '@/components/host-event-editor-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HostEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole('host', id);

  const supabase = await createClient();
  const [evRes, vRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).maybeSingle(),
    supabase.from('venues').select('id, name').order('name', { ascending: true }),
  ]);

  if (!evRes.data) notFound();

  return (
    <HostEventEditorClient
      event={evRes.data as unknown as HostEditableEvent}
      venues={vRes.data ?? []}
    />
  );
}
