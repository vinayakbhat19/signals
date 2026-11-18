'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { ArrowLeft, Download, Loader2, ShieldAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { buildSafeCsv } from '@/lib/csv-safe';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';
import type { ParticipantPrivate, ParticipantStatus } from '@/lib/types';

function pickField(row: Record<string, string>, patterns: RegExp[]): string {
  for (const [k, v] of Object.entries(row)) {
    if (patterns.some((p) => p.test(k.trim().toLowerCase())) && v?.trim()) {
      return v.trim();
    }
  }
  return '';
}

function HostParticipantsInner() {
  const params = useSearchParams();
  const eventId = params.get('id') ?? '';
  const { loading: authLoading } = useAuth();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [rows, setRows] = useState<ParticipantPrivate[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    const supabase = createClient();
    const [hostRes, evRes, pRes] = await Promise.all([
      supabase.rpc('is_event_host', { p_event: eventId }),
      supabase.from('events').select('title').eq('id', eventId).maybeSingle(),
      supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .order('performance_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
    ]);
    setAllowed(Boolean(hostRes.data));
    setEventTitle(evRes.data?.title || 'Event');
    setRows((pRes.data ?? []) as ParticipantPrivate[]);
  }, [eventId]);

  useEffect(() => {
    if (authLoading) return;
    const raf = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(raf);
  }, [authLoading, load]);

  function handleCsvUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('CSV must be 5 MB or smaller.');
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      async complete(res) {
        if (res.data.length > 5000) {
          toast.error('Maximum 5,000 rows per upload.');
          return;
        }
        setBusy(true);
        const supabase = createClient();
        const byEmail = new Map(
          rows.filter((r) => r.email).map((r) => [r.email!.toLowerCase(), r.id])
        );
        let created = 0;
        let updated = 0;
        for (const raw of res.data) {
          const name = pickField(raw, [/^name$/, /full name/, /participant/, /student/]);
          if (!name) continue;
          const email = pickField(raw, [/email/]) || null;
          const phone = pickField(raw, [/phone/, /contact/, /mobile/, /whatsapp/]) || null;
          const team = pickField(raw, [/team/]) || null;
          const college = pickField(raw, [/college/, /institution/]) || null;
          const department = pickField(raw, [/department/, /branch/]) || null;
          const matchId = email ? byEmail.get(email.toLowerCase()) : undefined;
          if (matchId) {
            await supabase
              .from('participants')
              .update({ name, team, college, department, phone })
              .eq('id', matchId);
            updated++;
          } else {
            await supabase.from('participants').insert({
              event_id: eventId,
              name,
              team,
              college,
              department,
              email,
              phone,
            });
            created++;
          }
        }
        setBusy(false);
        toast.success(`Imported: ${created} added, ${updated} updated.`);
        await load();
      },
    });
  }

  function exportCsv() {
    const csv = buildSafeCsv(
      ['order', 'name', 'team', 'college', 'department', 'email', 'phone', 'status'],
      rows.map((p) => [
        p.performance_order ?? '',
        p.name,
        p.team ?? '',
        p.college ?? '',
        p.department ?? '',
        p.email ?? '',
        p.phone ?? '',
        p.status,
      ])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle.toLowerCase().replace(/\s+/g, '-')}-participants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setStatus(id: string, status: ParticipantStatus) {
    const supabase = createClient();
    await supabase.from('participants').update({ status }).eq('id', id);
    await load();
  }

  async function setShowPublic(show: boolean) {
    const supabase = createClient();
    await supabase
      .from('participants')
      .update({ show_public: show })
      .eq('event_id', eventId);
    toast.success(show ? 'Line-up is now public.' : 'Line-up hidden from public.');
    await load();
  }

  if (authLoading || allowed === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-7 animate-spin text-[#FFD60A]" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto size-10 text-[#FF4F5E]" />
        <h1 className="font-display text-2xl text-[#F4F2FA]">NOT ALLOWED</h1>
      </div>
    );
  }

  const statuses: ParticipantStatus[] = [
    'registered',
    'checked_in',
    'on_stage',
    'performed',
    'withdrawn',
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/host/"
            className="flex size-10 items-center justify-center rounded-xl border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#22D3EE]">
              PARTICIPANTS &amp; LINE-UP
            </p>
            <h1 className="font-heading text-2xl font-extrabold text-[#F4F2FA]">
              {eventTitle} ({rows.length})
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#FFD60A] px-3.5 text-xs font-extrabold text-[#12091E]">
            <Upload className="size-3.5" />
            {busy ? 'Importing…' : 'Upload Google Forms CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) handleCsvUpload(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#1F1230] px-3.5 text-xs font-bold text-[#F4F2FA] cursor-pointer"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void setShowPublic(true)}
            className="h-10 rounded-xl border border-[#FFD60A]/50 px-3 text-xs font-bold text-[#FFD60A] cursor-pointer"
          >
            Publish line-up
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3B2758] bg-[#1F1230] p-10 text-center text-sm text-[#9C97B0]">
          Upload your Google Forms CSV export above to load participants.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#3B2758] bg-[#1F1230] px-4 py-3 text-xs"
            >
              <div>
                <p className="font-bold text-[#F4F2FA]">
                  {p.team ? `${p.team} · ${p.name}` : p.name}
                </p>
                <p className="text-[#9C97B0]">
                  {[p.email, p.phone, p.department].filter(Boolean).join(' · ')}
                </p>
              </div>
              <select
                value={p.status}
                onChange={(e) =>
                  void setStatus(p.id, e.target.value as ParticipantStatus)
                }
                className="h-9 rounded-lg border border-[#3B2758] bg-[#12091E] px-2.5 text-xs font-bold text-[#FFD60A]"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HostParticipantsPage() {
  return (
    <Suspense fallback={null}>
      <HostParticipantsInner />
    </Suspense>
  );
}
