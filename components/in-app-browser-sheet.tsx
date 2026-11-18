'use client';

import { useState, useSyncExternalStore } from 'react';
import { Check, Copy, ExternalLink, ShieldAlert } from 'lucide-react';

const IN_APP_UA_PATTERN =
  /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Snapchat|LinkedInApp|Telegram/i;

function subscribeNoop() {
  return () => {};
}

function getIsInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return IN_APP_UA_PATTERN.test(navigator.userAgent);
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsInAppBrowser(): boolean {
  return useSyncExternalStore(subscribeNoop, getIsInAppBrowser, getServerSnapshot);
}

export function InAppBrowserSheet() {
  const isInApp = useIsInAppBrowser();
  const [copied, setCopied] = useState(false);

  if (!isInApp) return null;

  async function copyCurrentUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored
    }
  }

  return (
    <div
      role="alert"
      className="rounded-[20px] border-2 border-[#FFE14D] bg-[#1F1230] p-4 space-y-2.5 shadow-[4px_4px_0_#FF4FD8]"
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className="mt-0.5 size-5 shrink-0 text-[#FFE14D]"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-extrabold text-[#F4F2FA]">
            Open in Chrome or Safari to continue with Google
          </p>
          <p className="text-xs leading-relaxed text-[#CFCBDD]">
            In-app browsers (Instagram, WhatsApp, etc.) block Google sign-in.
            Tap the menu (⋯) and choose <strong>Open in Browser</strong>, or
            copy this link — or sign in below with email &amp; password.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyCurrentUrl()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden="true" />
              Link copied!
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              Copy link
            </>
          )}
        </button>
        <a
          href={typeof window !== 'undefined' ? window.location.href : '/login'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#3B2758] px-3.5 text-xs font-bold text-[#F4F2FA]"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Open externally
        </a>
      </div>
    </div>
  );
}
