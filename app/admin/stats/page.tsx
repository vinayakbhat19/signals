'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminStatsPage() {
  const [counts, setCounts] = useState({
    events: 0,
    venues: 0,
    users: 0,
    stamps: 0,
    notices: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('venues').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('stamps').select('user_id', { count: 'exact', head: true }),
      supabase.from('announcements').select('id', { count: 'exact', head: true }),
    ]).then(([e, v, u, s, n]) => {
      setCounts({
        events: e.count ?? 0,
        venues: v.count ?? 0,
        users: u.count ?? 0,
        stamps: s.count ?? 0,
        notices: n.count ?? 0,
      });
    });
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl text-[#F4F2FA]">LIVE STATS</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Events', value: counts.events, color: '#FFD60A' },
          { label: 'Venues', value: counts.venues, color: '#22D3EE' },
          { label: 'Accounts', value: counts.users, color: '#FF4FD8' },
          { label: 'Hunt Stamps', value: counts.stamps, color: '#9B6CFF' },
          { label: 'Notices', value: counts.notices, color: '#FFE14D' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-4 text-center"
          >
            <p
              className="font-display text-3xl"
              style={{ color: item.color }}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs font-bold uppercase text-[#9C97B0]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
