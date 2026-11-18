import QRCode from 'qrcode';
import { HuntBoardClient } from '@/components/hunt-board-client';
import { getHunt, getLeaderboard, listStampPoints } from '@/lib/data/hunt';
import { readWithFallback } from '@/lib/resilience';

export const revalidate = 15;

export default async function HuntBoardPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';

  const [huntRes, boardRes, pointsRes, qrDataUrl] = await Promise.all([
    readWithFallback('board:hunt', () => getHunt(), null, 3000),
    readWithFallback('board:rows', () => getLeaderboard(20), [], 3000),
    readWithFallback('board:points', () => listStampPoints(), [], 3000),
    QRCode.toDataURL(`${siteUrl}/hunt?src=qr-board`, {
      width: 240,
      margin: 1,
    }),
  ]);

  return (
    <HuntBoardClient
      festName={festName}
      qrDataUrl={qrDataUrl}
      initialData={{
        hunt: huntRes.data,
        leaderboard: boardRes.data,
        totalPoints: pointsRes.data.length,
        serverTime: new Date().toISOString(),
      }}
    />
  );
}
