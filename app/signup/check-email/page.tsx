'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

function CheckEmailInner() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000
    );
    return () => window.clearInterval(t);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${siteUrl.replace(/\/$/, '')}/auth/callback/?next=/verified/`,
      },
    });
    setResending(false);
    if (error) {
      toast.error('Please wait a minute before trying again.');
    } else {
      toast.success('Confirmation link sent again!');
      setCooldown(60);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#FFD60A] text-[#12091E] shadow-[4px_4px_0_#FF4FD8]">
        <MailCheck className="size-8 stroke-[2.3]" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-[#F4F2FA]">CHECK YOUR EMAIL</h1>
        <p className="text-sm text-[#CFCBDD]">
          We sent a confirmation link to{' '}
          <strong className="text-[#FFD60A]">{email || 'your inbox'}</strong>.
          Tap it to activate your account.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={cooldown > 0 || resending || !email}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-bold text-[#F4F2FA] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="size-4" />
          {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend email'}
        </button>
        <Link href="/signup/" className="py-2 text-xs font-bold text-[#FFD60A] underline">
          Use a different email
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailInner />
    </Suspense>
  );
}
