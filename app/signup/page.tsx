'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlienMascot } from '@/components/mascots';
import { createClient } from '@/lib/supabase/client';

const COLLEGE_DOMAIN = 'sdmcet.ac.in';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCollegeEmail = email.trim().toLowerCase().endsWith(`@${COLLEGE_DOMAIN}`);
  const hasMinLen = password.length >= 8;
  const hasDigit = /\d/.test(password);
  const strength =
    (hasMinLen ? 1 : 0) + (hasDigit ? 1 : 0) + (password.length >= 12 ? 1 : 0);

  async function handleGoogle() {
    setLoadingGoogle(true);
    setErrorMsg(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback?next=/verified` },
    });
    if (error) {
      setErrorMsg(error.message);
      setLoadingGoogle(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!hasMinLen || !hasDigit) {
      setErrorMsg('Password must be at least 8 characters and include a number.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg('Please accept the fest code of conduct to continue.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${siteUrl}/auth/callback?next=/verified`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        toast.success('Account created!');
        router.push('/verified');
        router.refresh();
      } else {
        router.push(
          `/signup/check-email?email=${encodeURIComponent(email.trim())}`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-up failed.');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/welcome"
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <Link href="/login" className="text-xs font-extrabold text-[#FFD60A]">
            Already have an account? Log in
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <AlienMascot size={50} />
          <div>
            <h1 className="font-display text-[28px] leading-none text-[#F4F2FA]">
              CREATE ACCOUNT
            </h1>
            <p className="mt-1 text-xs text-[#BDB8CF]">
              Join Fiesta&apos;26 Stamp Hunt &amp; live audience voting.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-[#FF4F5E]/60 bg-[#FF4F5E]/15 px-4 py-3 text-sm font-medium text-[#FF9EA7]"
          >
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={loadingGoogle || loading}
          className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[18px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8] disabled:opacity-60 cursor-pointer"
        >
          {loadingGoogle && <Loader2 className="size-4 animate-spin" />}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9C97B0]">
          <span className="h-px flex-1 bg-[#3B2758]" />
          or with email
          <span className="h-px flex-1 bg-[#3B2758]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label htmlFor="su-name" className="text-xs font-bold text-[#BDB8CF]">
              Full name
            </label>
            <input
              id="su-name"
              type="text"
              required
              maxLength={80}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Asha Kulkarni"
              className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 text-sm text-[#F4F2FA] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="su-email" className="text-xs font-bold text-[#BDB8CF]">
              Email address
            </label>
            <input
              id="su-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${COLLEGE_DOMAIN}`}
              className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 text-sm text-[#F4F2FA] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
            />
            {isCollegeEmail && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#FFD60A]">
                <CheckCircle2 className="size-3.5" />
                You&apos;ll get the Verified SDMCET Student badge after
                confirming!
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="su-pass" className="text-xs font-bold text-[#BDB8CF]">
              Password (8+ chars with a number)
            </label>
            <div className="relative">
              <input
                id="su-pass"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 chars + 1 number"
                className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] pl-4 pr-12 text-sm text-[#F4F2FA] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#9C97B0] cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className="h-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        strength >= step
                          ? strength === 3
                            ? '#FFD60A'
                            : '#FF9F43'
                          : '#3B2758',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 pt-1 text-xs text-[#BDB8CF] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 size-4 accent-[#FFD60A]"
            />
            <span>
              I agree to play fair in the Stamp Hunt and Audience Voting.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || loadingGoogle}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#FFD60A] bg-[#1F1230] text-sm font-extrabold text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#12091E] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create account with email
          </button>
        </form>
      </div>
    </div>
  );
}
