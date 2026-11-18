'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface MfaFactor {
  id: string;
  friendly_name?: string;
  status: string;
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [aal, setAal] = useState<string>('aal1');

  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function loadFactors() {
    try {
      const supabase = createClient();
      const [factorsRes, aalRes] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (factorsRes.data) {
        setFactors(
          factorsRes.data.totp.map((f) => ({
            id: f.id,
            friendly_name: f.friendly_name,
            status: f.status,
          }))
        );
      }
      if (aalRes.data?.currentLevel) {
        setAal(aalRes.data.currentLevel);
      }
    } catch {
      toast.error('Could not load security status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const supabase = createClient();
        const [factorsRes, aalRes] = await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
        if (!active) return;
        if (factorsRes.data) {
          setFactors(
            factorsRes.data.totp.map((f) => ({
              id: f.id,
              friendly_name: f.friendly_name,
              status: f.status,
            }))
          );
        }
        if (aalRes.data?.currentLevel) {
          setAal(aalRes.data.currentLevel);
        }
      } catch {
        if (active) toast.error('Could not load security status.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  async function startEnroll() {
    setEnrolling(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: "Fiesta'26 Authenticator",
      });
      if (error || !data) {
        toast.error(error?.message || 'Could not start 2FA enrolment.');
        setEnrolling(false);
        return;
      }
      setPendingFactorId(data.id);
      setTotpSecret(data.totp.secret);
      const dataUrl = await QRCode.toDataURL(data.totp.uri, {
        width: 220,
        margin: 1,
      });
      setQrDataUrl(dataUrl);
    } catch {
      toast.error('Failed to generate 2FA QR.');
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyFactor(factorId: string) {
    if (code.trim().length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    try {
      const supabase = createClient();
      const { data: challenge, error: chErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (chErr || !challenge) {
        toast.error(chErr?.message || 'Challenge failed.');
        setVerifying(false);
        return;
      }
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verErr) {
        toast.error('Invalid 6-digit code. Please try again.');
        setVerifying(false);
        return;
      }
      toast.success('Two-factor authentication verified!');
      setPendingFactorId(null);
      setQrDataUrl(null);
      setTotpSecret(null);
      setCode('');
      await loadFactors();
      router.refresh();
    } catch {
      toast.error('Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  async function unenroll(factorId: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('2FA factor removed.');
    await loadFactors();
  }

  async function signOutAllDevices() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'global' });
    toast.success('Signed out on all devices.');
    router.push('/');
    router.refresh();
  }

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          aria-label="Back to account"
          className="flex size-11 items-center justify-center rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-[#F4F2FA]">SECURITY &amp; 2FA</h1>
          <p className="text-xs text-[#9C97B0]">
            Authenticator two-factor sign-in &amp; active sessions
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-8">
          <Loader2 className="size-6 animate-spin text-[#FFD60A]" />
        </div>
      ) : (
        <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#FFD60A]" />
              <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                Two-Factor Auth (TOTP)
              </h2>
            </div>
            <span className="rounded-full bg-[#2A1840] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#FFD60A]">
              {aal === 'aal2'
                ? 'Verified (AAL2)'
                : verifiedFactor
                  ? 'Challenge needed'
                  : 'Not enrolled'}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#CFCBDD]">
            Recommended for all organisers and admins. Once enrolled, admin
            control room pages require your 6-digit authenticator code.
          </p>

          {verifiedFactor && aal !== 'aal2' && (
            <div className="space-y-3 rounded-2xl border border-[#FFD60A]/50 bg-[#12091E] p-4">
              <p className="text-xs font-bold text-[#FFD60A]">
                Enter the 6-digit code from your authenticator app to unlock
                organiser tools:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="h-11 flex-1 rounded-xl border border-[#3B2758] bg-[#1F1230] px-3 text-center font-mono text-lg tracking-[0.25em] text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
                />
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => void verifyFactor(verifiedFactor.id)}
                  className="h-11 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
                >
                  {verifying ? 'Checking…' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {verifiedFactor && aal === 'aal2' && (
            <div className="flex items-center justify-between rounded-2xl border border-[#3B2758] bg-[#12091E] p-3.5">
              <span className="flex items-center gap-2 text-sm font-bold text-[#FFD60A]">
                <CheckCircle2 className="size-4" />
                Authenticator active
              </span>
              <button
                type="button"
                onClick={() => void unenroll(verifiedFactor.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#FF4F5E]/50 px-3 py-1.5 text-xs font-bold text-[#FF4F5E] cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          )}

          {!verifiedFactor && !pendingFactorId && (
            <button
              type="button"
              disabled={enrolling}
              onClick={() => void startEnroll()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
            >
              {enrolling && <Loader2 className="size-4 animate-spin" />}
              Set up authenticator app
            </button>
          )}

          {pendingFactorId && qrDataUrl && (
            <div className="space-y-3 rounded-2xl border border-[#FFD60A]/40 bg-[#12091E] p-4 text-center">
              <p className="text-xs font-bold text-[#F4F2FA]">
                1. Scan this QR in Google Authenticator, Authy, or 1Password:
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="TOTP setup QR code"
                className="mx-auto size-48 rounded-xl bg-white p-2"
              />
              {totpSecret && (
                <p className="break-all font-mono text-[11px] text-[#9C97B0]">
                  Manual key: {totpSecret}
                </p>
              )}
              <p className="text-xs font-bold text-[#F4F2FA]">
                2. Enter the 6-digit code to confirm:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="h-11 flex-1 rounded-xl border border-[#3B2758] bg-[#1F1230] px-3 text-center font-mono text-lg tracking-[0.25em] text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
                />
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => void verifyFactor(pendingFactorId)}
                  className="h-11 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E] cursor-pointer"
                >
                  {verifying ? 'Confirming…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <h2 className="font-heading text-base font-extrabold text-[#F4F2FA]">
          Active Sessions
        </h2>
        <p className="text-xs text-[#9C97B0]">
          Signed in on a shared station laptop or volunteer phone? Sign out on
          every device at once.
        </p>
        <button
          type="button"
          onClick={() => void signOutAllDevices()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#3B2758] bg-[#12091E] text-xs font-extrabold text-[#F4F2FA] hover:border-[#FFD60A] cursor-pointer"
        >
          <LogOut className="size-4" />
          Sign out on all devices
        </button>
      </section>
    </div>
  );
}
