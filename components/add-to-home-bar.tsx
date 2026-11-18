'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { AlienMascot } from '@/components/mascots';

const SESSION_DISMISS_KEY = 'fest-live:hide-a2hs-session';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AddToHomeBar() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) return;

    try {
      if (window.sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        return;
      }
    } catch {
      // Ignore storage access errors
    }

    const frame = window.requestAnimationFrame(() => setVisible(true));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setVisible(false);
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

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  return (
    <div
      role="region"
      aria-label="Add to Home Screen"
      className="fixed inset-x-3 bottom-[96px] z-40 mx-auto flex h-14 max-w-lg items-center gap-2.5 rounded-[18px] bg-[#F4F2FA] pl-3 pr-1.5 text-[#0B0A12] shadow-[0_10px_28px_rgba(0,0,0,0.55)] lg:hidden print:hidden"
    >
      <AlienMascot size={28} animate={false} className="shrink-0" />
      <span className="min-w-0 flex-1 text-[13px] font-bold leading-tight">
        Add Fest Live to your Home Screen
      </span>
      {deferredPrompt ? (
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="inline-flex h-10 shrink-0 items-center rounded-[12px] bg-[#0B0A12] px-3.5 text-sm font-extrabold text-[#C6FF3D] cursor-pointer"
        >
          Add
        </button>
      ) : (
        <Link
          href="/install"
          className="inline-flex h-10 shrink-0 items-center rounded-[12px] bg-[#0B0A12] px-3.5 text-sm font-extrabold text-[#C6FF3D]"
        >
          Add
        </Link>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss Add to Home Screen bar"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#0B0A12] hover:bg-black/10 cursor-pointer"
      >
        <X className="size-4 stroke-[2.6]" aria-hidden="true" />
      </button>
    </div>
  );
}
