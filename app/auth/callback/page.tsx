'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function getSafeNext(raw: string | null): string {
  if (!raw) return '/';
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')) {
    return raw;
  }
  return '/';
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const oauthErr = params.get('error');
    const code = params.get('code');
    const next = getSafeNext(params.get('next'));

    if (oauthErr === 'access_denied') {
      router.replace(`/login/?error=access_denied&next=${encodeURIComponent(next)}`);
      return;
    }

    const supabase = createClient();
    async function finish() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(next);
      } else {
        router.replace(`/login/?error=auth_failed&next=${encodeURIComponent(next)}`);
      }
    }

    void finish();
  }, [params, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="size-8 animate-spin text-[#FFD60A]" />
      <p className="text-sm font-bold text-[#F4F2FA]">Finishing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
