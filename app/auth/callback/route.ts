import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getSafeRedirect(nextParam: string | null): string {
  if (!nextParam) return '/';
  if (
    nextParam.startsWith('/') &&
    !nextParam.startsWith('//') &&
    !nextParam.startsWith('/\\')
  ) {
    return nextParam;
  }
  return '/';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const next = getSafeRedirect(searchParams.get('next'));

  if (oauthError === 'access_denied') {
    return NextResponse.redirect(
      `${origin}/login?error=access_denied&next=${encodeURIComponent(next)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] exchangeCodeForSession failed');
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_failed&next=${encodeURIComponent(next)}`
  );
}
