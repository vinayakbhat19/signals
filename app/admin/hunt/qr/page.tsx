import { requireOrganiser } from '@/lib/auth';
import { rotateStampCodeAction } from '@/app/admin/hunt/actions';
import {
  HuntStickersClient,
  type StampQrItem,
} from '@/components/hunt-stickers-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminHuntQrPage() {
  await requireOrganiser();
  const supabase = await createClient();

  let items: StampQrItem[] = [];
  try {
    const { data } = await (
      supabase as unknown as {
        rpc: (
          fn: string
        ) => Promise<{ data: StampQrItem[] | null; error: unknown }>;
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
      canRotate
      onRotate={rotateStampCodeAction}
    />
  );
}
