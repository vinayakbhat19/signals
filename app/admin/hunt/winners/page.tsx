import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Mail, Trophy } from 'lucide-react';
import { requireOrganiser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface HuntWinnerRow {
  rank: number;
  user_id: string;
  full_name: string | null;
  email: string | null;
  stamps: number;
  score: number;
  minutes_taken: number | null;
  hidden: boolean;
}

export default async function AdminHuntWinnersPage() {
  await requireOrganiser();
  const supabase = await createClient();

  let winners: HuntWinnerRow[] = [];
  try {
    const { data } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          args: { p_limit: number }
        ) => Promise<{ data: HuntWinnerRow[] | null }>;
      }
    ).rpc('hunt_winners', { p_limit: 50 });
    winners = data ?? [];
  } catch {
    winners = [];
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/hunt"
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
              spot shared sticker photos (all views are audit-logged).
            </p>
          </div>
        </div>
      </div>

      {winners.length === 0 ? (
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
                <th className="px-4 py-3">Minutes Taken</th>
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
                      {w.hidden && (
                        <span className="ml-1.5 rounded bg-[#3B2758] px-1.5 py-0.5 text-[10px] text-[#BDB8CF]">
                          hidden
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#CFCBDD]">
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
