import Link from 'next/link';
import { Archive, Radio, Sparkles } from 'lucide-react';
import { CAMPUS_BRAND } from '@/lib/modes';
import { getAppStatusWithPreview } from '@/lib/status';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

interface SignalPublicRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  tags: string[];
  status: string;
  expires_at: string;
  created_at: string;
}

export default async function SignalsPage() {
  const appStatus = await getAppStatusWithPreview();

  let signals: SignalPublicRow[] = [];
  if (appStatus.mode === 'campus') {
    try {
      const supabase = createPublicClient();
      // NEVER select('*') from signals — contact column is restricted by RLS
      const { data } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (k: string, v: string) => {
                order: (k: string, o: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{
                    data: SignalPublicRow[] | null;
                  }>;
                };
              };
            };
          };
        }
      )
        .from('signals')
        .select('id, kind, title, body, tags, status, expires_at, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(30);
      signals = data ?? [];
    } catch {
      signals = [];
    }
  }

  return (
    <div className="space-y-6">
      {appStatus.is_preview && (
        <div className="rounded-xl bg-[#9B6CFF] px-4 py-2 text-center text-xs font-extrabold text-[#12091E]">
          CAMPUS MODE PREVIEW (ONLY VISIBLE TO YOU)
        </div>
      )}

      <header className="rounded-[24px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22D3EE]/20 px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#22D3EE]">
          <Radio className="size-3.5" />
          {CAMPUS_BRAND.name} · {CAMPUS_BRAND.tagline}
        </span>
        <h1 className="font-display text-3xl text-[#F4F2FA]">CAMPUS SIGNALS</h1>
        <p className="text-sm text-[#CFCBDD]">
          Find hackathon teammates, study groups, project collaborators, and
          campus club updates at {CAMPUS_BRAND.college}.
        </p>
      </header>

      {appStatus.mode !== 'campus' ? (
        <div className="rounded-[22px] border-[1.5px] border-dashed border-[#FFD60A]/60 bg-[#1F1230] p-6 text-center space-y-3">
          <Sparkles className="mx-auto size-8 text-[#FFD60A]" />
          <h2 className="font-heading text-xl font-extrabold text-[#F4F2FA]">
            Fiesta&apos;26 is live right now!
          </h2>
          <p className="mx-auto max-w-md text-sm text-[#BDB8CF]">
            The campus Signals board returns automatically on{' '}
            <strong>28 Nov 2026, 12:00 AM IST</strong> right after Fiesta&apos;26
            wraps up.
          </p>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E]"
          >
            Back to Fiesta&apos;26 Live
          </Link>
        </div>
      ) : (
        <>
          <Link
            href="/fest-archive"
            className="flex items-center justify-between rounded-[20px] border border-[#FFD60A]/50 bg-[#1F1230] px-4 py-3.5 text-sm font-bold text-[#FFD60A] hover:border-[#FFD60A]"
          >
            <span className="flex items-center gap-2">
              <Archive className="size-4" />
              Fiesta&apos;26 Memories, Winners &amp; Results Archive
            </span>
            <span>Open →</span>
          </Link>

          {signals.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#3B2758] bg-[#1F1230]/60 p-8 text-center space-y-2">
              <p className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                No open signals yet
              </p>
              <p className="text-xs text-[#9C97B0]">
                Campus Signals opens full teammate matching &amp; project boards
                shortly after Fiesta&apos;26 wraps up.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {signals.map((sig) => (
                <article
                  key={sig.id}
                  className="rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4 space-y-2"
                >
                  <span className="rounded-full bg-[#2A1840] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#22D3EE]">
                    {sig.kind}
                  </span>
                  <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
                    {sig.title}
                  </h2>
                  {sig.body && (
                    <p className="text-xs leading-relaxed text-[#CFCBDD]">
                      {sig.body}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
