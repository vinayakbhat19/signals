import type { Metadata } from 'next';
import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Scan QR',
  description: 'Scan event, voting, or Stamp Hunt QR codes around campus.',
};

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <PageHeader
        title="Scan a QR"
        subtitle="Point your camera at any Fiest 2026 event, voting, or Stamp Station QR."
      />
      <div className="flex flex-col items-center gap-4 rounded-[24px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#C6FF3D] text-[#0B0A12] shadow-[4px_4px_0_#FF4FA3]">
          <QrCode className="size-8 stroke-[2.4]" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Camera scanner coming in Track H
          </h2>
          <p className="text-sm text-[#9C97B0]">
            You can also scan any poster directly with your phone&apos;s built-in
            camera app to open events, votes, and stamps.
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#C6FF3D] px-5 text-sm font-extrabold text-[#0B0A12]"
        >
          Browse events
        </Link>
      </div>
    </div>
  );
}
