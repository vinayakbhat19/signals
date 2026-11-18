import { notFound } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import {
  HuntStickersClient,
  type StampQrItem,
} from '@/components/hunt-stickers-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function StaffHuntStickersPage() {
  const profile = await getProfile();
  if (!profile) notFound();

  const supabase = await createClient();
  const { data: allowed } = await (
    supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: boolean | null }>;
    }
  ).rpc('can_make_qr');

  if (!allowed && !['organiser', 'admin', 'volunteer', 'scorer'].includes(profile.role)) {
    notFound();
  }

  let items: StampQrItem[] = [];
  try {
    const { data } = await (
      supabase as unknown as {
        rpc: (fn: string) => Promise<{ data: StampQrItem[] | null }>;
      }
    ).rpc('list_stamp_qrs');
    items = data ?? [];
  } catch {
    items = [];
  }

  return (
    <HuntStickersClient
      items={items}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL || ''}
    />
  );
}
