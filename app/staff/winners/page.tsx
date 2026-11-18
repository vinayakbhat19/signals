'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Loader2, Mail, ShieldAlert, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

interface WinnerRow {
  rank: number;
  user_id: string;
  full_name: string | null;
  email: string | null;
  stamps: number;
  score: number;
  minutes_taken: number | null;
  hidden: boolean;
}

export default function StaffWinnersPage() {
  const { loading: authLoading, isVolunteer, isOrganiser } = useAuth();
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isVolunteer) return;
    let active = true;
    const supabase = createClient();
    supabase
      .rpc('hunt_winners', { p_limit: 50 })
      .then(({ data }) => {
        if (!active) return;
        setWinners((data ?? []) as WinnerRow[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, isVolunteer]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!isVolunteer) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">NOT ALLOWED</h1>
        <p className="text-sm text-[#9C97B0]">
          Only volunteers and organisers can view the Prize Desk winners list.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={isOrganiser ? '/admin/hunt/' : '/volunteer/'}
          className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl text-[#F4F2FA] sm:text-3xl">
            <Trophy className="size-6 text-[#FFE14D]" />
            PRIZE DESK · WINNERS
          </h1>
          <p className="text-xs text-[#9C97B0]">
            Contact top hunters by email. Watch &ldquo;Minutes taken&rdquo; to
            spot shared sticker photos (access is logged).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
        </div>
      ) : winners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3B2758] bg-[#1F1230] p-8 text-center text-sm text-[#9C97B0]">
          No Treasure Hunt stamps collected yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-[#3B2758] bg-[#1F1230]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#3B2758] bg-[#12091E]/60 text-[11px] uppercase text-[#9C97B0]">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Places</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B2758]">
              {winners.map((w) => {
                const suspicious =
                  w.stamps >= 5 && (w.minutes_taken ?? 999) < w.stamps;
                return (
                  <tr key={w.user_id} className="hover:bg-[#2A1840]/50">
                    <td className="px-4 py-3 font-extrabold text-[#FFD60A]">
                      #{w.rank}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#F4F2FA]">
                      {w.full_name || 'Student'}
                    </td>
                    <td className="px-4 py-3">
                      {w.email ? (
                        <a
                          href={`mailto:${w.email}`}
                          className="inline-flex items-center gap-1 text-[#22D3EE] hover:underline"
                        >
                          <Mail className="size-3" />
                          {w.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#F4F2FA]">
                      {w.stamps}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-[#FF4FD8]">
                      {w.score} pts
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          suspicious ? 'text-[#FF4F5E]' : 'text-[#CFCBDD]'
                        }`}
                      >
                        {suspicious && <AlertTriangle className="size-3.5" />}
                        {w.minutes_taken != null ? `${w.minutes_taken} min` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
