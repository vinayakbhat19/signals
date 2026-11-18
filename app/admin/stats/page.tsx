import { requireOrganiser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminStatsPage() {
  await requireOrganiser();
  const supabase = await createClient();

  const [profilesRes, verifiedRes, eventsRes, stampsRes, votesRes] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('college_verified', true),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('stamps').select('user_id', { count: 'exact', head: true }),
      supabase.from('votes').select('user_id', { count: 'exact', head: true }),
    ]);

  const cards = [
    { label: 'Total Accounts', value: profilesRes.count ?? 0, color: '#FFD60A' },
    {
      label: 'Verified @sdmcet.ac.in',
      value: verifiedRes.count ?? 0,
      color: '#22D3EE',
    },
    { label: 'Published Events', value: eventsRes.count ?? 0, color: '#9B6CFF' },
    { label: 'Stamps Claimed', value: stampsRes.count ?? 0, color: '#FF4FD8' },
    { label: 'Audience Votes', value: votesRes.count ?? 0, color: '#FF9F43' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4"
          >
            <div
              className="font-heading text-3xl font-extrabold"
              style={{ color: c.color }}
            >
              {c.value}
            </div>
            <div className="mt-1 text-xs font-bold text-[#BDB8CF]">
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#9C97B0]">
        For live page views and <code>?src=qr-...</code> scan breakdown, open{' '}
        <strong>Vercel Dashboard → Analytics</strong>.
      </p>
    </div>
  );
}
