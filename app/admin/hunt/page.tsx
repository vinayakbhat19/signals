import { requireOrganiser } from '@/lib/auth';
import {
  AdminHuntClient,
  type AdminHuntConfig,
  type AdminHuntPlace,
} from '@/components/admin-hunt-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminHuntPage() {
  await requireOrganiser();
  const supabase = await createClient();

  let config: AdminHuntConfig = {
    name: 'Fiesta Treasure Hunt',
    opens_at: '2026-11-25T09:00:00+05:30',
    closes_at: '2026-11-27T18:00:00+05:30',
    stamp_value: 10,
    complete_bonus: 20,
    min_gap_seconds: 45,
    sequential: false,
  };
  let places: AdminHuntPlace[] = [];

  try {
    const [cfgRes, ptsRes] = await Promise.all([
      (
        supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (k: string, v: number) => {
                maybeSingle: () => Promise<{ data: Partial<AdminHuntConfig> | null }>;
              };
            };
          };
        }
      )
        .from('stamp_hunt')
        .select('name, opens_at, closes_at, stamp_value, complete_bonus, min_gap_seconds, sequential')
        .eq('id', 1)
        .maybeSingle(),
      (
        supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              order: (k: string, o: { ascending: boolean }) => Promise<{
                data: AdminHuntPlace[] | null;
              }>;
            };
          };
        }
      )
        .from('stamp_points')
        .select('id, name, clue, hint, found_text, mascot, sort, active')
        .order('sort', { ascending: true }),
    ]);

    if (cfgRes.data) {
      config = {
        ...config,
        ...cfgRes.data,
        min_gap_seconds: cfgRes.data.min_gap_seconds ?? 45,
        sequential: Boolean(cfgRes.data.sequential),
      };
    }
    places = ptsRes.data ?? [];
  } catch {
    places = [];
  }

  return <AdminHuntClient config={config} places={places} />;
}
