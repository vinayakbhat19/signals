'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      setLoading(false);
      if (!res.ok) {
        toast.error(json.error || 'Please try again later.');
      } else {
        setSent(true);
        toast.success('Check your inbox');
      }
    } catch {
      setLoading(false);
      toast.error('Network error. Please try again.');
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
            If an account exists for <strong>{email}</strong>, we sent a
            password reset link.
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
