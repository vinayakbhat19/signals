import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { TreasureClaimClient } from '@/components/treasure-claim-client';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StaticStampClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await requireUser(`/s/${token}`);

  const dotIdx = token.indexOf('.');
  const pointId = dotIdx > 0 ? token.slice(0, dotIdx) : '';
  const code = dotIdx > 0 ? token.slice(dotIdx + 1) : '';

  if (!UUID_RE.test(pointId) || code.length < 4) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-2xl text-[#F4F2FA]">INVALID QR LINK</h1>
        <p className="text-sm text-[#BDB8CF]">
          This QR sticker link does not look right. Try scanning the sticker
          again or ask a volunteer.
        </p>
        <Link
          href="/hunt"
          className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
        >
          Back to Treasure Hunt
        </Link>
      </div>
    );
  }

  return <TreasureClaimClient pointId={pointId} code={code} />;
}
