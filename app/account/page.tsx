import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountClient } from '@/components/account-client';
import { AlienMascot } from '@/components/mascots';
import { getProfile } from '@/lib/auth';
import { getLeaderboard, getMyStamps, listStampPoints } from '@/lib/data/hunt';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Account',
  description: "Your Fiesta'26 profile, badges, stamps, and account settings.",
};

export default async function AccountPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-4 text-center">
        <div className="flex justify-center">
          <AlienMascot size={72} />
        </div>
        <h1 className="font-display text-3xl text-[#F4F2FA]">MY ACCOUNT</h1>
        <p className="text-sm text-[#CFCBDD]">
          Sign in with your <strong>@sdmcet.ac.in</strong> email or Google to
          collect stamps, cast live votes, and get the Verified Student badge.
        </p>
        <div className="space-y-2.5 pt-2">
          <Link
            href="/signup"
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8]"
          >
            Create account
          </Link>
          <Link
            href="/login?next=/account"
            className="flex h-12 w-full items-center justify-center rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-bold text-[#F4F2FA]"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [stamps, leaderboard, points, votesRes] = await Promise.all([
    getMyStamps(profile.id),
    getLeaderboard(100),
    listStampPoints(),
    supabase
      .from('votes')
      .select('poll_id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
  ]);

  const myRow = leaderboard.find((r) => r.user_id === profile.id);

  return (
    <AccountClient
      profile={profile}
      stampsCount={stamps.length}
      totalStamps={points.length}
      huntRank={myRow?.rank ?? null}
      votesCount={votesRes.count ?? 0}
    />
  );
}
