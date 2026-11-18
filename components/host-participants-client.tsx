'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  importParticipantsAction,
  setShowLineupAction,
  updateParticipantStatusAction,
} from '@/app/host/events/[id]/participants/actions';
import type { ParticipantPrivate, ParticipantStatus } from '@/lib/types';

function pickField(row: Record<string, string>, patterns: RegExp[]): string {
  for (const [key, value] of Object.entries(row)) {
    const clean = key.trim().toLowerCase();
    if (patterns.some((p) => p.test(clean)) && value?.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function HostParticipantsClient({
  eventId,
  eventTitle,
  participants,
}: {
  eventId: string;
  eventTitle: string;
  participants: ParticipantPrivate[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showPublic, setShowPublic] = useState(
    participants.length === 0 || participants.some((p) => p.show_public)
  );

  function handleCsvUpload(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(res) {
        const mapped = res.data
          .map((raw) => {
            const name = pickField(raw, [
              /^name$/,
              /full name/,
              /participant/,
              /student name/,
            ]);
            const email = pickField(raw, [/email/]);
            const phone = pickField(raw, [/phone/, /contact/, /mobile/, /whatsapp/]);
            const team = pickField(raw, [/team/]);
            const college = pickField(raw, [/college/, /institution/]);
            const department = pickField(raw, [/department/, /branch/]);
            const orderRaw = pickField(raw, [/^order$/, /performance_order/, /slot/]);
            const orderNum = orderRaw ? Number.parseInt(orderRaw, 10) : NaN;
            return {
              name,
              email: email || null,
              phone: phone || null,
              team: team || null,
              college: college || null,
              department: department || null,
              performance_order:
                Number.isFinite(orderNum) && orderNum >= 1 && orderNum <= 999
                  ? orderNum
                  : null,
            };
          })
          .filter((r) => r.name.length > 0);

        if (mapped.length === 0) {
          toast.error('No valid participant rows found. Check the Name column.');
          return;
        }

        startTransition(async () => {
          const out = await importParticipantsAction(eventId, mapped);
          if (!out.ok) toast.error(out.error);
          else
            toast.success(
              `Imported! ${out.created} added, ${out.updated} updated.`
            );
        });
      },
    });
  }

  function exportCsv() {
    const csv = Papa.unparse(
      participants.map((p) => ({
        order: p.performance_order ?? '',
        name: p.name,
        team: p.team ?? '',
        college: p.college ?? '',
        department: p.department ?? '',
        email: p.email ?? '',
        phone: p.phone ?? '',
        status: p.status,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle.toLowerCase().replace(/\s+/g, '-')}-participants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statuses: ParticipantStatus[] = [
    'registered',
    'checked_in',
    'on_stage',
    'performed',
    'withdrawn',
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFD60A]"
        >
          <ArrowLeft className="size-4" /> Control Room
        </Link>
        <Link
          href={`/events/${eventId}/line-up`}
          className="text-xs font-bold text-[#22D3EE] underline"
        >
          Public line-up view →
        </Link>
      </div>

      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF4FD8]">
          HOST PARTICIPANTS
        </span>
        <h1 className="font-display text-2xl text-[#F4F2FA]">{eventTitle}</h1>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFD60A] px-4 text-xs font-extrabold text-[#12091E]">
          <Upload className="size-4" /> Upload Google Forms CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCsvUpload(f);
            }}
          />
        </label>

        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#3B2758] bg-[#12091E] px-4 text-xs font-bold text-[#F4F2FA] cursor-pointer"
        >
          <Download className="size-4" /> Export CSV
        </button>

        <label className="ml-auto flex items-center gap-2 text-xs font-bold cursor-pointer">
          <span>Show line-up to students</span>
          <input
            type="checkbox"
            checked={showPublic}
            disabled={isPending}
            onChange={(e) => {
              const next = e.target.checked;
              setShowPublic(next);
              startTransition(async () => {
                const r = await setShowLineupAction(eventId, next);
                if (!r.ok) toast.error(r.error);
                else toast.success(next ? 'Line-up visible' : 'Line-up hidden');
              });
            }}
            className="size-5 accent-[#FFD60A]"
          />
        </label>
      </div>

      {/* Participants list */}
      <div className="space-y-2.5">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#3B2758] bg-[#1F1230] p-3.5"
          >
            <div className="min-w-0">
              <div className="font-bold text-[#F4F2FA]">
                {p.performance_order ? `#${p.performance_order} · ` : ''}
                {p.team ? `${p.team} (${p.name})` : p.name}
              </div>
              <div className="text-xs text-[#9C97B0]">
                {[p.department, p.college, p.email, p.phone]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {statuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await updateParticipantStatusAction(
                        eventId,
                        p.id,
                        st
                      );
                      if (!r.ok) toast.error(r.error);
                    })
                  }
                  className={
                    p.status === st
                      ? 'h-8 rounded-lg bg-[#FFD60A] px-2.5 text-[11px] font-extrabold uppercase text-[#12091E] cursor-pointer'
                      : 'h-8 rounded-lg border border-[#3B2758] bg-[#12091E] px-2.5 text-[11px] font-bold uppercase text-[#9C97B0] cursor-pointer'
                  }
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
        {participants.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#3B2758] p-8 text-center text-sm text-[#9C97B0]">
            No participants imported yet. Export responses from your Google Form
            as CSV and upload above!
          </div>
        )}
      </div>
    </div>
  );
}
