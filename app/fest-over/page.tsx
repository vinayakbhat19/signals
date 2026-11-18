import Image from 'next/image';
import Link from 'next/link';
import { Archive, ArrowRight, Sparkles, Trophy, Vote } from 'lucide-react';
import { getLeaderboard } from '@/lib/data/hunt';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 60;

export default async function FestOverPage() {
  const leaderboard = await getLeaderboard(3).catch(() => []);

  let topFavourites: Array<{ name: string; votes: number }> = [];
  try {
    const supabase = createPublicClient();
    const { data } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (k: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: Array<{ name: string; votes: number }> | null;
              }>;
            };
          };
        };
      }
    )
      .from('poll_results_archive')
      .select('name, votes')
      .order('votes', { ascending: false })
      .limit(3);
    if (data && data.length > 0) {
      topFavourites = data;
    }
  } catch {
    // Graceful fallback
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <header className="halftone-band rounded-[26px] border-[1.5px] border-[#3B2758] p-6 text-center space-y-3">
        <Image
          src="/brand/fiesta26-logo.png"
          alt="Fiesta'26"
          width={150}
          height={58}
          className="mx-auto h-14 w-auto object-contain"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD60A] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#12091E]">
          <Sparkles className="size-3.5" />
          25–27 NOV 2026 · SDMCET DHARWAD
        </span>
        <h1 className="font-display text-4xl leading-none text-[#F4F2FA]">
          WHAT A WRAP!
        </h1>
        <p className="text-sm leading-relaxed text-[#CFCBDD]">
          Fiesta&apos;26 is officially over — thank you to every performer,
          participant, volunteer, and student who made it unforgettable. Your
          campus app is now back in <strong>Signals</strong> mode.
        </p>
      </header>

      {/* Stamp Hunt Winners */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <Trophy className="size-5 text-[#FFE14D]" />
          Stamp Hunt Champions
        </h2>
        {leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((row, idx) => (
              <div
                key={row.user_id}
                className="flex items-center justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <span className="font-bold text-[#F4F2FA]">
                  #{idx + 1} · {row.display_name || 'Student'}
                </span>
                <span className="font-extrabold text-[#FFD60A]">
                  {row.score} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#9C97B0]">
            Final Stamp Hunt standings are preserved in the archive.
          </p>
        )}
      </section>

      {/* Audience Favourites */}
      {topFavourites.length > 0 && (
        <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Vote className="size-5 text-[#FF4FD8]" />
            Audience Favourites
          </h2>
          <div className="space-y-2">
            {topFavourites.map((fav, idx) => (
              <div
                key={`${fav.name}-${idx}`}
                className="flex items-center justify-between rounded-xl bg-[#12091E] px-3.5 py-2.5 text-sm"
              >
                <span className="font-bold text-[#F4F2FA]">{fav.name}</span>
                <span className="font-extrabold text-[#FF4FD8]">
                  {fav.votes} votes
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="space-y-2.5">
        <Link
          href="/signals"
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8]"
        >
          Open Signals
          <ArrowRight className="size-5" />
        </Link>
        <Link
          href="/fest-archive"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A]"
        >
          <Archive className="size-4 text-[#FFD60A]" />
          Browse full Fiesta&apos;26 Archive
        </Link>
      </div>
    </div>
  );
}
