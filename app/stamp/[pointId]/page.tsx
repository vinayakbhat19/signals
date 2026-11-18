import { StampClaimClient } from '@/components/stamp-claim-client';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function StampClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ pointId: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { pointId } = await params;
  const { c } = await searchParams;
  const code = c ?? '';

  const returnPath = `/stamp/${pointId}${code ? `?c=${encodeURIComponent(code)}` : ''}`;
  await requireUser(returnPath);

  return <StampClaimClient pointId={pointId} code={code} />;
}
