'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck } from 'lucide-react';

const COOKIE_PREF_KEY = 'fiesta26:cookie-choice';

export function openCookieNotice() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fiesta:open-cookies'));
  }
}

export function CookieSheet() {
  const [open, setOpen] = useState(false);
  const [allowPrefs, setAllowPrefs] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COOKIE_PREF_KEY);
      if (!saved) {
        const timer = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(timer);
      }
      const parsed = JSON.parse(saved) as { prefs?: boolean };
      const frame = window.requestAnimationFrame(() =>
        setAllowPrefs(parsed.prefs !== false)
      );
      return () => window.cancelAnimationFrame(frame);
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('fiesta:open-cookies', handler);
    return () => window.removeEventListener('fiesta:open-cookies', handler);
  }, []);

  if (!open) return null;

  function saveChoice() {
    try {
      window.localStorage.setItem(
        COOKIE_PREF_KEY,
        JSON.stringify({ essential: true, prefs: allowPrefs, savedAt: Date.now() })
      );
    } catch {
      // Ignore storage errors
    }
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookies and privacy"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-xs"
    >
      <div className="w-full max-w-md space-y-4 rounded-[26px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 text-[#F4F2FA] shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FFD60A] text-[#12091E]">
            <Cookie className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-extrabold">
              Cookies &amp; privacy
            </h2>
            <p className="text-xs text-[#BDB8CF]">
              No ad trackers. Vercel Analytics is cookie-free.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#3B2758] bg-[#12091E] p-3">
            <div>
              <p className="font-bold text-[#F4F2FA]">
                Essential sign-in cookies
              </p>
              <p className="text-[#9C97B0]">
                Keeps you signed in for Stamp Hunt and Audience Voting.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#3B2758] px-2 py-0.5 text-[10px] font-extrabold text-[#FFD60A]">
              <ShieldCheck className="size-3" /> ON
            </span>
          </div>

          <label className="flex items-start justify-between gap-3 rounded-2xl border border-[#3B2758] bg-[#12091E] p-3 cursor-pointer">
            <div>
              <p className="font-bold text-[#F4F2FA]">Local preferences</p>
              <p className="text-[#9C97B0]">
                Remembers dismissed alerts and saved offline votes.
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowPrefs}
              onChange={(e) => setAllowPrefs(e.target.checked)}
              className="mt-1 size-5 accent-[#FFD60A]"
            />
          </label>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-[#9C97B0]">
          <Link
            href="/privacy"
            onClick={() => setOpen(false)}
            className="underline underline-offset-2 hover:text-[#FFD60A]"
          >
            Privacy Policy
          </Link>
          <span>·</span>
          <Link
            href="/terms"
            onClick={() => setOpen(false)}
            className="underline underline-offset-2 hover:text-[#FFD60A]"
          >
            Terms of Service
          </Link>
        </div>

        <button
          type="button"
          onClick={saveChoice}
          className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
