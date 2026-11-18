'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlienMascot } from '@/components/mascots';
import { InAppBrowserSheet } from '@/components/in-app-browser-sheet';
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
    initialError === 'access_denied'
      ? 'Sign-in was cancelled. You can try again anytime or continue browsing.'
      : initialError === 'auth_failed'
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
        window.location.origin || process.env.NEXT_PUBLIC_SITE_URL || '';
      const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback/?next=${encodeURIComponent(safeNext)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        setErrorMsg(
          error.message?.toLowerCase().includes('provider')
            ? 'Google sign-in is not enabled yet. Please use email & password below.'
            : error.message || 'Could not start Google sign-in. Try email & password below.'
        );
        setLoadingGoogle(false);
      }
    } catch {
      setErrorMsg('Could not start Google sign-in. Try email & password below.');
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
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErrorMsg('Invalid email or password.');
        setLoadingEmail(false);
        return;
      }
      toast.success('Signed in!');
      router.push(safeNext);
    } catch {
      setErrorMsg('Sign-in is busy right now. Please try again.');
      setLoadingEmail(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={safeNext.startsWith('/login') ? '/' : safeNext}
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-5" />
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
              Play the Treasure Hunt, cast live votes, and save your progress.
            </p>
          </div>
        </div>

        <InAppBrowserSheet />

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[16px] border border-[#FF4F5E]/50 bg-[#FF4F5E]/15 px-4 py-3 text-sm font-medium text-[#FF9EA7]"
          >
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={loadingGoogle || loadingEmail}
          className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[18px] bg-[#FFD60A] text-base font-extrabold text-[#12091E] shadow-[5px_5px_0_#FF4FD8] disabled:opacity-60 cursor-pointer"
        >
          {loadingGoogle ? (
            <Loader2 className="size-5 animate-spin" />
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
          Fastest way in — any Google or email account can vote and play.
        </p>

        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-[#9C97B0]">
          <span className="h-px flex-1 bg-[#3B2758]" />
          or email &amp; password
          <span className="h-px flex-1 bg-[#3B2758]" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-3.5">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] px-4 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-12 w-full rounded-[14px] border-[1.5px] border-[#3B2758] bg-[#1F1230] pl-4 pr-12 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password"
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-[#9C97B0] cursor-pointer"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <Link href="/reset/" className="font-bold text-[#FFD60A] hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup/" className="font-bold text-[#CFCBDD]">
              Create account →
            </Link>
          </div>
          <button
            type="submit"
            disabled={loadingEmail || loadingGoogle}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[#3B2758] bg-[#1F1230] text-sm font-extrabold text-[#F4F2FA] hover:border-[#FFD60A] cursor-pointer"
          >
            {loadingEmail && <Loader2 className="size-4 animate-spin" />}
            Log in with email
          </button>
        </form>
      </div>
    </div>
  );
}
