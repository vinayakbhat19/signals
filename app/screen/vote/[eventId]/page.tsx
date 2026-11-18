import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { StageVoteScreenClient } from '@/components/stage-vote-screen-client';
import { requireVolunteer } from '@/lib/auth';
import { getPollByEvent, getPollResults } from '@/lib/data/voting';
import { createClient } from '@/lib/supabase/server';
import type { LiveCodeResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function StageVoteScreenPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireVolunteer();
  const { eventId } = await params;

  const poll = await getPollByEvent(eventId);
  if (!poll) notFound();

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const [results, liveRes, batchRes, qrDataUrl] = await Promise.all([
    getPollResults(poll.id),
    poll.require_code
      ? supabase.rpc('get_vote_code', { p_poll: poll.id })
      : Promise.resolve({ data: null }),
    poll.require_code
      ? supabase.rpc('get_vote_codes', { p_poll: poll.id, p_hours: 6 })
      : Promise.resolve({ data: [] }),
    QRCode.toDataURL(`${siteUrl}/vote/${eventId}?src=qr-stage`, {
      width: 400,
      margin: 1,
    }),
  ]);

  return (
    <StageVoteScreenClient
      eventId={eventId}
      qrDataUrl={qrDataUrl}
      offlineCodes={
        (batchRes.data as unknown as Array<{ w: number; code: string }> | null) ??
        []
      }
      initialData={{
        poll,
        results,
        liveCode: (liveRes.data as unknown as LiveCodeResult | null) ?? null,
        serverTime: new Date().toISOString(),
      }}
    />
  );
}
