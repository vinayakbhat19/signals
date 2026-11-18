'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { AlienMascot } from '@/components/mascots';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const frame = window.requestAnimationFrame(() => {
      if (isAndroid) setPlatform('android');
    });

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }

  const steps =
    platform === 'ios'
      ? [
          {
            num: 1,
            text: (
              <>
                Tap the <strong className="text-[#F4F2FA]">Share</strong> button
                at the bottom of Safari
              </>
            ),
            icon: <Share className="size-6 text-[#22D3EE]" aria-hidden="true" />,
          },
          {
            num: 2,
            text: (
              <>
                Scroll down and tap{' '}
                <strong className="text-[#F4F2FA]">Add to Home Screen</strong>
              </>
            ),
            icon: (
              <PlusSquare
                className="size-6 text-[#C6FF3D]"
                aria-hidden="true"
              />
            ),
          },
          {
            num: 3,
            text: (
              <>
                Tap <strong className="text-[#F4F2FA]">Add</strong>, then open
                Fest Live from your Home Screen
              </>
            ),
            icon: (
              <Smartphone
                className="size-6 text-[#A78BFA]"
                aria-hidden="true"
              />
            ),
          },
        ]
      : [
          {
            num: 1,
            text: (
              <>
                Tap the{' '}
                <strong className="text-[#F4F2FA]">Add to Home Screen</strong>{' '}
                button below, or Chrome menu ⋮
              </>
            ),
            icon: (
              <MoreVertical
                className="size-6 text-[#22D3EE]"
                aria-hidden="true"
              />
            ),
          },
          {
            num: 2,
            text: (
              <>
                Choose{' '}
                <strong className="text-[#F4F2FA]">Install app</strong> or{' '}
                <strong className="text-[#F4F2FA]">Add to Home screen</strong>
              </>
            ),
            icon: (
              <PlusSquare
                className="size-6 text-[#C6FF3D]"
                aria-hidden="true"
              />
            ),
          },
          {
            num: 3,
            text: (
              <>
                Launch <strong className="text-[#F4F2FA]">Fest Live</strong>{' '}
                full-screen from your icon anytime
              </>
            ),
            icon: (
              <Smartphone
                className="size-6 text-[#A78BFA]"
                aria-hidden="true"
              />
            ),
          },
        ];

  return (
    <div className="mx-auto max-w-md space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] text-[#F4F2FA]"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
        <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#9C97B0]">
          NO APP STORE NEEDED
        </span>
      </div>

      {/* Hero icon + title */}
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-[22px] border-2 border-[#C6FF3D] bg-[#16141F] shadow-[4px_4px_0_#FF4FA3]">
          <AlienMascot size={54} />
        </div>
        <h1 className="font-heading text-[32px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#F4F2FA]">
          Add Fest Live to your Home Screen
        </h1>
      </div>

      <p className="text-sm leading-relaxed text-[#CFCBDD]">
        It gets its own icon and opens full screen like an app. Free, under 1 MB,
        and works smoothly on weak campus signal.
      </p>

      {/* Platform switcher */}
      <div
        role="tablist"
        aria-label="Phone type"
        className="grid grid-cols-2 gap-1.5 rounded-[16px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'ios'}
          onClick={() => setPlatform('ios')}
          className={cn(
            'h-10 rounded-[11px] text-sm transition-colors cursor-pointer',
            platform === 'ios'
              ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
              : 'font-semibold text-[#BDB8CF]'
          )}
        >
          iPhone (Safari)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'android'}
          onClick={() => setPlatform('android')}
          className={cn(
            'h-10 rounded-[11px] text-sm transition-colors cursor-pointer',
            platform === 'android'
              ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
              : 'font-semibold text-[#BDB8CF]'
          )}
        >
          Android (Chrome)
        </button>
      </div>

      {/* Numbered steps */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex items-center gap-3.5 rounded-[20px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-3.5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[#C6FF3D] font-heading text-base font-extrabold text-[#0B0A12]">
              {step.num}
            </span>
            <p className="flex-1 text-sm leading-snug text-[#CFCBDD]">
              {step.text}
            </p>
            {step.icon}
          </div>
        ))}
      </div>

      {/* Primary install button (if native prompt available) + Maybe later */}
      <div className="space-y-3 pt-2">
        {installed ? (
          <div className="rounded-[18px] border border-[#C6FF3D]/40 bg-[#C6FF3D]/15 p-4 text-center text-sm font-bold text-[#C6FF3D]">
            Fest Live has been added to your Home Screen!
          </div>
        ) : deferredPrompt ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#C6FF3D] text-base font-extrabold text-[#0B0A12] shadow-[4px_4px_0_#FF4FA3] cursor-pointer"
          >
            <PlusSquare className="size-5" aria-hidden="true" />
            Add to Home Screen
          </button>
        ) : null}

        <Link
          href="/"
          className="block py-2 text-center text-sm font-bold text-[#BDB8CF] hover:text-[#F4F2FA]"
        >
          Maybe later
        </Link>
      </div>
    </div>
  );
}
