'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft, Bell, Check, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveFeed } from '@/lib/live-store';
import { CAMPUS_BRAND } from '@/lib/modes';

const SIGNAL_TYPES = [
  {
    color: '#22D3EE',
    title: 'Need a teammate',
    desc: 'Hackathon, contest or project: find the missing person for your team.',
  },
  {
    color: '#FF9F43',
    title: 'Want to build',
    desc: 'Got an idea? Find a developer, designer or someone to build it with.',
  },
  {
    color: '#FF4FD8',
    title: 'Open to connect',
    desc: 'Say hi to people with the same interests, at a talk or in the hostel.',
  },
  {
    color: '#C6FF3D',
    title: 'Open to work',
    desc: 'Offer your skills for a club, a fest team or a startup.',
  },
] as const;

export default function SignalsPage() {
  const { feed } = useLiveFeed();
  const isCampus = feed.status.mode === 'campus';
  const [notified, setNotified] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('fiesta26_signals_notify') === '1';
    } catch {
      return false;
    }
  });

  function handleNotifyToggle() {
    const next = !notified;
    setNotified(next);
    try {
      if (next) localStorage.setItem('fiesta26_signals_notify', '1');
      else localStorage.removeItem('fiesta26_signals_notify');
    } catch {
      // ignore storage errors
    }
    if (next) {
      toast.success("You're on the list! We'll alert you when Signals opens on 28 Nov.");
    } else {
      toast.info('Signals launch alert turned off.');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Header matching Screen 51 */}
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to Home"
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-[#F4F2FA] hover:border-[#FFD60A]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#FFE14D]">
            OUR NEXT APP · {CAMPUS_BRAND.college}
          </span>
          <h1 className="font-display text-2xl leading-tight text-[#F4F2FA]">
            SIGNALS
          </h1>
        </div>
      </header>

      {/* Mascot + Coming Soon Hero */}
      <section className="flex items-center gap-4">
        <svg
          className="m-bob size-[88px] shrink-0"
          viewBox="0 0 72 72"
          aria-hidden="true"
        >
          <path
            d="M13 47c0-17 10-30 23-30s23 13 23 30c0 9-7 13-23 13S13 56 13 47z"
            fill="#9B6CFF"
          />
          <g className="m-blink">
            <ellipse cx="29" cy="40" rx="4.2" ry="5.2" fill="#0B0A12" />
            <ellipse cx="43" cy="40" rx="4.2" ry="5.2" fill="#0B0A12" />
          </g>
          <path
            d="M31 49c3 2.5 7 2.5 10 0"
            stroke="#0B0A12"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M26 17l-3-8M36 15V6M46 17l3-8"
            stroke="#FFD60A"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="space-y-1.5">
          <span className="inline-block rounded-full bg-[#FFD60A] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0A12]">
            {isCampus ? 'CAMPUS MODE' : 'COMING SOON'}
          </span>
          <h2 className="font-heading text-[22px] font-extrabold leading-[1.1] text-[#F4F2FA]">
            Find your people. Build, play, team up.
          </h2>
        </div>
      </section>

      <p className="text-sm leading-relaxed text-[#CFCBDD]">
        Signals is our campus app. Post a short Signal saying what you are
        looking for, and people nearby on campus answer with &ldquo;I&apos;m
        in&rdquo;.
      </p>

      {/* 4 Signal Types */}
      <ul className="space-y-2.5">
        {SIGNAL_TYPES.map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-3.5 py-3"
          >
            <span
              className="size-10 shrink-0 rounded-xl"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <strong className="block text-sm font-extrabold text-[#F4F2FA]">
                {item.title}
              </strong>
              <span className="block text-xs leading-snug text-[#BDB8CF]">
                {item.desc}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* How it works */}
      <section className="rounded-[20px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-4 space-y-1.5">
        <strong className="block text-sm font-extrabold text-[#F4F2FA]">
          How it works
        </strong>
        <p className="text-[13px] leading-relaxed text-[#BDB8CF]">
          <strong className="text-[#FFE14D]">1.</strong> Post a Signal in 20
          seconds. <strong className="text-[#FFE14D]">2.</strong> People tap
          &ldquo;I&apos;m in&rdquo;.{' '}
          <strong className="text-[#FFE14D]">3.</strong> You accept the ones you
          like. Contact details are shared{' '}
          <strong className="text-[#F4F2FA]">only after you accept</strong>, and
          Signals expire by themselves.
        </p>
      </section>

      {isCampus ? (
        <div className="space-y-3">
          <Link
            href="/fest-archive/"
            className="flex items-center justify-between rounded-[20px] border border-[#FFD60A]/50 bg-[#1F1230] px-4 py-3.5 text-sm font-bold text-[#FFD60A]"
          >
            <span className="flex items-center gap-2">
              <Archive className="size-4" />
              Fiesta&apos;26 Memories, Winners &amp; Results Archive
            </span>
            <span>Open →</span>
          </Link>
          <div className="rounded-[20px] border border-dashed border-[#22D3EE]/50 bg-[#1F1230] p-5 text-center space-y-1.5">
            <Radio className="mx-auto size-7 text-[#22D3EE]" />
            <p className="text-sm font-bold text-[#F4F2FA]">
              Campus Signals board opening shortly!
            </p>
            <p className="text-xs text-[#BDB8CF]">
              Teammate matching &amp; campus project boards reopen right after
              Fiesta&apos;26 wraps up.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-[13px] font-bold text-[#FFE14D]">
            Opens on campus right after Fiesta&apos;26, from 28 Nov 2026
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/"
              className="flex h-[52px] items-center justify-center rounded-2xl border-[1.5px] border-[#4A3466] text-sm font-bold text-[#F4F2FA] hover:border-[#FFD60A]"
            >
              Back to the fest
            </Link>
            <button
              type="button"
              onClick={handleNotifyToggle}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] text-sm font-extrabold text-[#0B0A12] shadow-[4px_4px_0_#FF4FD8] cursor-pointer active:translate-y-0.5"
            >
              {notified ? (
                <>
                  <Check className="size-4 stroke-[2.6]" />
                  Alert set
                </>
              ) : (
                <>
                  <Bell className="size-4 stroke-[2.4]" />
                  Notify me
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-[#9C8FB0]">
            Notify me turns on one alert when Signals opens. You can switch it
            off any time.
          </p>
        </div>
      )}
    </div>
  );
}
