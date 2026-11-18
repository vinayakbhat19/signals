'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl}/auth/callback?next=/reset/new`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('Reset link sent!');
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <Link
        href="/login"
        className="inline-flex size-11 items-center justify-center rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="space-y-1.5">
        <h1 className="font-display text-3xl text-[#F4F2FA]">RESET PASSWORD</h1>
        <p className="text-sm text-[#BDB8CF]">
          Enter your email and we&apos;ll send a link to choose a new password.
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-[#FFD60A]/40 bg-[#1F1230] p-5 space-y-2 text-sm">
          <Mail className="size-6 text-[#FFD60A]" />
          <p className="font-bold text-[#F4F2FA]">Check your inbox</p>
          <p className="text-[#BDB8CF]">
            Open the password reset link we sent to <strong>{email}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@sdmcet.ac.in"
            className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </button>
        </form>
      )}
    </div>
  );
}
