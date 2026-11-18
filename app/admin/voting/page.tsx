import { AdminVotingClient } from '@/components/admin-voting-client';
import { requireOrganiser } from '@/lib/auth';
import { listEvents } from '@/lib/data/events';
import { listPolls } from '@/lib/data/voting';
import { createClient } from '@/lib/supabase/server';
import type { Contestant } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminVotingPage() {
  await requireOrganiser();
  const [events, polls, supabase] = await Promise.all([
    listEvents(),
    listPolls(false),
    createClient(),
  ]);

  const { data: allContestants } = await supabase
    .from('contestants')
    .select('id, poll_id, name, subtitle, photo_url, sort, active')
    .order('sort', { ascending: true });

  const byPoll: Record<string, Contestant[]> = {};
  for (const c of (allContestants ?? []) as Contestant[]) {
    byPoll[c.poll_id] = [...(byPoll[c.poll_id] ?? []), c];
  }

  return (
    <AdminVotingClient
      events={events}
      polls={polls}
      contestantsByPoll={byPoll}
    />
  );
}
