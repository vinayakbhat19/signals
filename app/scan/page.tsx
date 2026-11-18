import type { Metadata } from 'next';
import { QrScannerClient } from '@/components/qr-scanner-client';

export const metadata: Metadata = {
  title: 'Scan QR',
  description: 'Scan a Stamp Station, Audience Vote, or Event poster QR.',
};

export default function ScanPage() {
  return <QrScannerClient />;
}
