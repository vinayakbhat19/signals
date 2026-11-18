'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlienMascot } from '@/components/mascots';
import { createClient } from '@/lib/supabase/client';

interface LoginFormProps {
  nextPath: string;
  initialError?: string | null;
}

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    initialError === 'auth_failed'
      ? 'Sign-in link expired or failed. Please try again.'
      : null
  );

  const safeNext =
    nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';

  async function handleGoogleSignIn() {
    setLoadingGoogle(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) {
        setErrorMsg(error.message);
        setLoadingGoogle(false);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not start Google sign-in.'
      );
      setLoadingGoogle(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Enter your email and password.');
      return;
    }
    setLoadingEmail(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErrorMsg(error.message);
        setLoadingEmail(false);
        return;
      }
      toast.success('Signed in!');
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed.');
      setLoadingEmail(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={safeNext === '/login' ? '/' : safeNext}
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#9C97B0]">
            BROWSING NEEDS NO SIGN-IN
          </span>
        </div>

        <div className="flex items-center gap-3">
          <AlienMascot size={54} />
          <div>
            <h1 className="font-heading text-[34px] font-extrabold leading-none tracking-[-0.03em] text-[#F4F2FA]">
              Log in
            </h1>
            <p className="mt-1 text-sm text-[#9C97B0]">
              Collect stamps, cast live votes, and save your progress.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[16px] border border-[#FF4F5E]/50 bg-[#FF4F5E]/15 px-4 py-3 text-sm font-medium text-[#FF9EA7]"
          >
            {errorMsg}
          </div>
        )}

        {/* Primary Google button */}
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={loadingGoogle || loadingEmail}
          className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8] transition-transform active:translate-y-0.5 disabled:opacity-60 cursor-pointer"
        >
          {loadingGoogle ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.92h5.35c-.23 1.49-1.7 4.37-5.35 4.37-3.22 0-5.85-2.67-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.93 14.55 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.64-3.65 8.64-8.8 0-.59-.07-1.04-.29-1.1z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <p className="text-center text-xs text-[#9C97B0]">
          Use your <strong className="text-[#F4F2FA]">@sdmcet.ac.in</strong>{' '}
          account for the Verified Student badge.
        </p>

        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-[#9C97B0]">
          <span className="h-px flex-1 bg-[#3B2758]" />
          or email & password
          <span className="h-px flex-1 bg-[#3B2758]" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-3.5">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-bold uppercase tracking-[0.06em] text-[#BDB8CF]"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sdmcet.ac.in"
              className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 text-sm text-[#F4F2FA] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-bold uppercase tracking-[0.06em] text-[#BDB8CF]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] pl-4 pr-12 text-sm text-[#F4F2FA] placeholder:text-[#8A8599] focus:border-[#FFD60A] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#9C97B0] hover:text-[#F4F2FA] cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <Link href="/reset" className="font-bold text-[#FFD60A] hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup" className="font-bold text-[#CFCBDD] hover:text-[#F4F2FA]">
              Create account →
            </Link>
          </div>

          <button
            type="submit"
            disabled={loadingEmail || loadingGoogle}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-extrabold text-[#F4F2FA] hover:border-[#FFD60A] disabled:opacity-60 cursor-pointer"
          >
            {loadingEmail && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            Log in with email
          </button>
        </form>
      </div>

      <p className="pt-6 text-center text-xs text-[#9C97B0]">
        Just want to check the schedule?{' '}
        <Link href="/" className="font-bold text-[#FFD60A] underline">
          Continue browsing
        </Link>
      </p>
    </div>
  );
}
