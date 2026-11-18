import { notFound } from 'next/navigation';
import { HostParticipantsClient } from '@/components/host-participants-client';
import { getProfile } from '@/lib/auth';
import { getEvent } from '@/lib/data/events';
import { createClient } from '@/lib/supabase/server';
import type { ParticipantPrivate } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HostParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) notFound();

  const supabase = await createClient();
  const isOrganiser =
    profile.role === 'organiser' || profile.role === 'admin';
  if (!isOrganiser) {
    const { data: allowed } = await supabase.rpc('is_event_host', {
      p_event: id,
    });
    if (!allowed) notFound();
  }

  const [event, partsRes] = await Promise.all([
    getEvent(id),
    supabase
      .from('participants')
      .select(
        'id, event_id, name, team, college, department, email, phone, performance_order, status, show_public, created_at, updated_at'
      )
      .eq('event_id', id)
      .order('performance_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true }),
  ]);

  if (!event) notFound();

  return (
    <HostParticipantsClient
      eventId={event.id}
      eventTitle={event.title}
      participants={(partsRes.data ?? []) as ParticipantPrivate[]}
    />
  );
}
