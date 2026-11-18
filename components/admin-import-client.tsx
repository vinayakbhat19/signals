'use client';

import { useState, useTransition } from 'react';
import Papa from 'papaparse';
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { importScheduleCsvAction } from '@/app/admin/actions';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/types';

interface ParsedRow {
  rowNum: number;
  code: string;
  title: string;
  description: string;
  category: EventCategory;
  venue: string;
  date: string;
  start: string;
  end: string;
  registration_url: string;
  contact_info: string;
  host_name: string;
  host_coordinator: string;
  errors: string[];
  warning?: string;
  isUpdate: boolean;
}

const VALID_CATS = new Set<string>(EVENT_CATEGORIES);

const TEMPLATE_CSV = `code,title,description,category,venue,date,start,end,registration_url,contact_info,host_name,host_coordinator
F01,StreetPlay,Open-air theatre competition,cultural,Admin Block,2026-11-25,17:00,18:15,https://forms.gle/6nCPmJd3th3H3YG89,,Cultural Committee,
`;

export function AdminImportClient({
  existingCodes,
}: {
  existingCodes: string[];
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const existingSet = new Set(existingCodes);

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const seenCodes = new Set<string>();
        const parsed: ParsedRow[] = results.data.map((raw, idx) => {
          const get = (k: string) => (raw[k] ?? '').trim();
          const code = get('code');
          const title = get('title');
          const category = get('category').toLowerCase();
          const date = get('date');
          const start = get('start');
          const end = get('end');
          const registration_url = get('registration_url');
          const errors: string[] = [];
          let warning: string | undefined;

          if (!code) errors.push('Missing code');
          else if (seenCodes.has(code)) errors.push(`Duplicate code "${code}"`);
          else seenCodes.add(code);

          if (!title) errors.push('Missing title');
          if (!VALID_CATS.has(category))
            errors.push(`Invalid category "${category}"`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            errors.push('Date must be YYYY-MM-DD');
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))
            errors.push('Start must be 24h HH:MM');
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(end))
            errors.push('End must be 24h HH:MM');
          if (start && end && end <= start) {
            warning = 'Ends next day (crosses midnight IST)';
          }
          if (registration_url) {
            try {
              const u = new URL(registration_url);
              if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                errors.push('Registration URL must be http/https');
              }
            } catch {
              errors.push('Invalid registration URL');
            }
          }

          return {
            rowNum: idx + 2,
            code,
            title,
            description: get('description'),
            category: (VALID_CATS.has(category)
              ? category
              : 'cultural') as EventCategory,
            venue: get('venue'),
            date,
            start,
            end,
            registration_url,
            contact_info: get('contact_info'),
            host_name: get('host_name'),
            host_coordinator: get('host_coordinator'),
            errors,
            warning,
            isUpdate: existingSet.has(code),
          };
        });
        setRows(parsed);
      },
      error(err) {
        toast.error(`CSV parse error: ${err.message}`);
      },
    });
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiesta26_schedule_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  function handleImport() {
    if (rows.length === 0 || errorCount > 0) return;
    startTransition(async () => {
      const res = await importScheduleCsvAction(
        rows.map((r) => ({
          code: r.code,
          title: r.title,
          description: r.description,
          category: r.category,
          venue: r.venue,
          date: r.date,
          start: r.start,
          end: r.end,
          registration_url: r.registration_url,
          contact_info: r.contact_info,
          host_name: r.host_name,
          host_coordinator: r.host_coordinator,
        }))
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Imported! ${res.created} created, ${res.updated} updated.`
      );
      setRows([]);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#3B2758] bg-[#1F1230] p-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            Import Schedule CSV
          </h2>
          <p className="text-xs text-[#BDB8CF]">
            Columns: code, title, description, category, venue, date
            (YYYY-MM-DD), start (HH:MM), end (HH:MM), registration_url,
            contact_info, host_name, host_coordinator. Times are Asia/Kolkata.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#3B2758] bg-[#12091E] px-3.5 text-xs font-bold text-[#FFD60A] cursor-pointer"
        >
          <Download className="size-4" /> Download template
        </button>
      </div>

      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#3B2758] bg-[#1F1230]/50 p-6 text-center hover:border-[#FFD60A]">
        <Upload className="size-7 text-[#FFD60A]" />
        <span className="text-sm font-bold text-[#F4F2FA]">
          Tap to upload CSV from Google Sheets
        </span>
        <span className="text-xs text-[#9C97B0]">
          Re-importing updates existing events by code (zero duplicates)
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold">
              {rows.length} rows ·{' '}
              <span className="text-[#FFD60A]">
                {rows.filter((r) => !r.isUpdate && r.errors.length === 0).length}{' '}
                new
              </span>{' '}
              ·{' '}
              <span className="text-[#22D3EE]">
                {rows.filter((r) => r.isUpdate && r.errors.length === 0).length}{' '}
                update
              </span>{' '}
              ·{' '}
              <span className="text-[#FF4F5E]">{errorCount} errors</span>
            </div>

            <button
              type="button"
              disabled={errorCount > 0 || isPending}
              onClick={handleImport}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              {isPending ? 'Importing…' : `Import ${rows.length} events`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-[18px] border border-[#3B2758] bg-[#1F1230]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#3B2758] bg-[#12091E] text-[#9C97B0]">
                <tr>
                  <th className="p-3">Row</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Date &amp; IST</th>
                  <th className="p-3">Venue</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.rowNum}
                    className="border-t border-[#3B2758]/60"
                  >
                    <td className="p-3 text-[#9C97B0]">{r.rowNum}</td>
                    <td className="p-3 font-mono font-bold text-[#FFD60A]">
                      {r.code || '—'}
                    </td>
                    <td className="p-3 font-bold text-[#F4F2FA]">
                      {r.title || '—'}
                    </td>
                    <td className="p-3 text-[#CFCBDD]">
                      {r.date} {r.start}–{r.end}
                    </td>
                    <td className="p-3 text-[#CFCBDD]">{r.venue || 'TBA'}</td>
                    <td className="p-3">
                      {r.errors.length > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#FF4F5E]">
                          <AlertTriangle className="size-3.5" />
                          {r.errors.join('; ')}
                        </span>
                      ) : (
                        <span className="font-bold text-[#FFD60A]">
                          {r.isUpdate ? 'Update' : 'New'}
                          {r.warning ? ` (${r.warning})` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
