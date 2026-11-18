import { requireVolunteer } from '@/lib/auth';
import AdminHuntWinnersPage from '@/app/admin/hunt/winners/page';
import { AlertTriangle, Mail, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { HuntWinnerRow } from '@/app/admin/hunt/winners/page';

export const dynamic = 'force-dynamic';

export default async function StaffWinnersPage() {
  const profile = await requireVolunteer();
  if (profile.role === 'organiser' || profile.role === 'admin') {
    return <AdminHuntWinnersPage />;
  }

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
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="flex items-center gap-2 font-display text-2xl text-[#F4F2FA] sm:text-3xl">
        <Trophy className="size-6 text-[#FFE14D]" />
        PRIZE DESK · TREASURE HUNT WINNERS
      </h1>
      {winners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3B2758] bg-[#1F1230] p-8 text-center text-sm text-[#9C97B0]">
          No stamps collected yet.
        </div>
      ) : (
        <div className="space-y-2">
          {winners.map((w) => {
            const suspicious =
              w.stamps >= 5 && (w.minutes_taken ?? 999) < w.stamps;
            return (
              <div
                key={w.user_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#3B2758] bg-[#1F1230] px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-extrabold text-[#FFD60A]">#{w.rank}</span>{' '}
                  <strong className="text-[#F4F2FA]">
                    {w.full_name || 'Student'}
                  </strong>
                  {w.email && (
                    <a
                      href={`mailto:${w.email}`}
                      className="ml-2 inline-flex items-center gap-1 text-[#22D3EE] underline"
                    >
                      <Mail className="size-3" />
                      {w.email}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-[#FF4FD8]">{w.score} pts</span>
                  <span>{w.stamps} places</span>
                  <span
                    className={
                      suspicious
                        ? 'inline-flex items-center gap-1 text-[#FF4F5E]'
                        : 'text-[#BDB8CF]'
                    }
                  >
                    {suspicious && <AlertTriangle className="size-3.5" />}
                    {w.minutes_taken ?? 0} min
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
