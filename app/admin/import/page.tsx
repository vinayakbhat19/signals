'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { istToUtc } from '@/lib/time';

export default function AdminImportPage() {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      async complete(res) {
        setBusy(true);
        const supabase = createClient();
        const { data: venues } = await supabase.from('venues').select('id, name');
        const vMap = new Map((venues ?? []).map((v) => [v.name.toLowerCase(), v.id]));
        const messages: string[] = [];
        let okCount = 0;

        for (const row of res.data) {
          const title = (row.title || '').trim();
          if (!title) continue;
          const code = (row.code || '').trim() || null;
          const venueName = (row.venue || '').trim() || 'Campus Venue (TBA)';
          let venueId = vMap.get(venueName.toLowerCase()) ?? null;
          if (!venueId) {
            const { data: created } = await supabase
              .from('venues')
              .insert({ name: venueName })
              .select('id')
              .single();
            if (created?.id) {
              venueId = created.id;
              vMap.set(venueName.toLowerCase(), venueId);
            }
          }

          const date = (row.date || '').trim() || '2026-11-25';
          const start = (row.start || '').trim() || '10:00';
          const end = (row.end || '').trim() || '12:00';
          const payload = {
            code,
            title,
            description: (row.description || '').trim() || null,
            category: (row.category || 'cultural').trim().toLowerCase(),
            venue_id: venueId,
            starts_at: istToUtc(date, start).toISOString(),
            ends_at: istToUtc(date, end).toISOString(),
            registration_url:
              (row.registration_url || '').trim() ||
              'https://linktr.ee/sdmcetFiesta26',
            contact_info: (row.contact_info || '').trim() || null,
            host_name: (row.host_name || '').trim() || null,
            host_coordinator: (row.host_coordinator || '').trim() || null,
            is_published: true,
          };

          const { error } = code
            ? await supabase.from('events').upsert(payload, { onConflict: 'code' })
            : await supabase.from('events').insert(payload);

          if (error) messages.push(`Error (${title}): ${error.message}`);
          else okCount++;
        }

        setBusy(false);
        setLog([`Imported/updated ${okCount} event(s).`, ...messages]);
        toast.success(`Imported ${okCount} events!`);
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-6 space-y-4">
        <h2 className="font-display text-2xl text-[#F4F2FA]">
          IMPORT SCHEDULE CSV
        </h2>
        <p className="text-xs text-[#BDB8CF]">
          Upload <code>templates/fiesta26_events.csv</code> (or any updated
          schedule CSV). Rows with the same <code>code</code> update in place
          without duplicating!
        </p>
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#FFD60A]/60 bg-[#12091E] text-sm font-extrabold text-[#FFD60A]">
          <Upload className="size-6" />
          {busy ? 'Importing…' : 'Choose CSV file'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handleFile(f);
            }}
          />
        </label>
        {log.length > 0 && (
          <div className="rounded-xl bg-[#12091E] p-3 text-xs text-[#CFCBDD] space-y-1">
            {log.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
