'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Gauge,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface AuditRow {
  id: number;
  at: string;
  action: string;
  target: string | null;
}

export default function AdminSafetyPage() {
  const [writesPaused, setWritesPaused] = useState(false);
  const [modeOverride, setModeOverride] = useState<'auto' | 'fest' | 'campus'>('auto');
  const [activeMode, setActiveMode] = useState<'fest' | 'campus'>('fest');
  const [pollSeconds, setPollSeconds] = useState(30);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerLevel, setBannerLevel] = useState<'info' | 'warning' | 'critical'>('info');
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [cfgRes, statusRes, logRes] = await Promise.all([
      supabase
        .from('app_config')
        .select('writes_paused, mode_override, banner_message, banner_level, poll_seconds')
        .eq('id', 1)
        .maybeSingle(),
      supabase.rpc('app_status'),
      supabase
        .from('audit_log')
        .select('id, at, action, target')
        .order('at', { ascending: false })
        .limit(10),
    ]);

    if (cfgRes.data) {
      setWritesPaused(Boolean(cfgRes.data.writes_paused));
      setModeOverride(
        (cfgRes.data.mode_override as 'auto' | 'fest' | 'campus') || 'auto'
      );
      setBannerMessage(cfgRes.data.banner_message ?? '');
      setBannerLevel(
        (cfgRes.data.banner_level as 'info' | 'warning' | 'critical') || 'info'
      );
      setPollSeconds(Number(cfgRes.data.poll_seconds ?? 30));
    }
    if (statusRes.data) {
      setActiveMode(
        (statusRes.data as { mode?: string }).mode === 'campus'
          ? 'campus'
          : 'fest'
      );
    }
    setAuditLogs((logRes.data ?? []) as AuditRow[]);
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(raf);
  }, [load]);

  async function saveConfig(nextPaused = writesPaused, nextMode = modeOverride) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('app_config')
      .update({
        writes_paused: nextPaused,
        mode_override: nextMode,
        banner_message: bannerMessage.trim() || null,
        banner_level: bannerLevel,
        poll_seconds: pollSeconds,
      })
      .eq('id', 1);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Safety settings saved! All phones pick it up automatically.');
      await load();
    }
  }

  async function runPurge() {
    if (purgeConfirm.trim() !== 'DELETE FEST DATA') return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('archive_and_purge_fest');
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      const d = data as {
        votes_deleted?: number;
        push_deleted?: number;
        contacts_cleared?: number;
      };
      toast.success(
        `Purged: ${d.votes_deleted ?? 0} votes, ${d.push_deleted ?? 0} push devices, ${d.contacts_cleared ?? 0} contacts cleared.`
      );
      setPurgeConfirm('');
      await load();
    }
  }

  return (
    <div className="space-y-6">
      {/* Kill Switch & Poll Interval Slider (HOSTING_CLOUDFLARE.md §5) */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
              <AlertTriangle className="size-5 text-[#FFE14D]" />
              Votes &amp; Stamps Kill Switch
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                writesPaused
                  ? 'bg-[#FF4F5E] text-white'
                  : 'bg-[#FFD60A] text-[#12091E]'
              }`}
            >
              {writesPaused ? 'PAUSED' : 'ACTIVE'}
            </span>
          </div>
          <p className="text-xs text-[#BDB8CF]">
            Instantly stops new votes and stamp claims at the database while
            schedule browsing stays online.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveConfig(!writesPaused, modeOverride)}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold cursor-pointer ${
              writesPaused
                ? 'bg-[#FFD60A] text-[#12091E]'
                : 'bg-[#FF4F5E] text-white'
            }`}
          >
            {writesPaused ? (
              <>
                <PlayCircle className="size-4" />
                Resume votes &amp; stamps
              </>
            ) : (
              <>
                <PauseCircle className="size-4" />
                Pause votes &amp; stamps
              </>
            )}
          </button>
        </section>

        <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
              <Gauge className="size-5 text-[#22D3EE]" />
              Free Egress Guard (Polling Slider)
            </h2>
            <span className="font-heading text-lg font-extrabold text-[#FFD60A]">
              {pollSeconds}s
            </span>
          </div>
          <p className="text-xs text-[#BDB8CF]">
            If Supabase egress climbs faster than expected, slide this up to
            60–90 s and every phone slows down automatically without redeploy.
          </p>
          <input
            type="range"
            min={10}
            max={300}
            step={5}
            value={pollSeconds}
            onChange={(e) => setPollSeconds(Number(e.target.value))}
            className="w-full accent-[#FFD60A]"
          />
          <div className="flex justify-between text-[10px] text-[#9C97B0]">
            <span>10s (Fast)</span>
            <span>30s (Default)</span>
            <span>90s (Save egress)</span>
            <span>300s</span>
          </div>
        </section>
      </div>

      {/* Banner + Mode */}
      <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
        <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
          Top Banner &amp; App Mode (Currently: {activeMode.toUpperCase()})
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            maxLength={200}
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            placeholder="Optional global top banner…"
            className="h-11 md:col-span-2 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          />
          <select
            value={bannerLevel}
            onChange={(e) =>
              setBannerLevel(e.target.value as 'info' | 'warning' | 'critical')
            }
            className="h-11 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
          >
            <option value="info">Info (Violet)</option>
            <option value="warning">Warning (Yellow)</option>
            <option value="critical">Critical (Red)</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['auto', 'fest', 'campus'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeOverride(m)}
              className={`h-10 rounded-xl border text-xs font-extrabold uppercase cursor-pointer ${
                modeOverride === m
                  ? 'border-[#FFD60A] bg-[#FFD60A] text-[#12091E]'
                  : 'border-[#3B2758] bg-[#12091E] text-[#CFCBDD]'
              }`}
            >
              {m === 'auto' ? 'Automatic' : m === 'fest' ? 'Force Fest' : 'Force Campus'}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void saveConfig(writesPaused, modeOverride)}
          className="h-11 rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] cursor-pointer"
        >
          Save banner, mode &amp; polling interval
        </button>

        <p className="text-[11px] text-[#9C97B0]">
          <strong>Emergency DB-down backup:</strong> Edit{' '}
          <code>public/emergency.json</code> directly on GitHub to overlay
          emergency banners &amp; delays while Cloudflare Pages stays online.
        </p>
      </section>

      {/* Post-Fest Archive & Purge */}
      <section className="rounded-[22px] border border-[#FF4F5E]/40 bg-[#1F1230] p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <Trash2 className="size-5 text-[#FF4F5E]" />
          Archive Results &amp; Purge Personal Data
        </h2>
        <p className="text-xs text-[#CFCBDD]">
          Available only in <strong>campus mode</strong>. Keeps vote totals &amp;
          leaderboard; deletes individual votes, push devices, and participant
          emails/phones.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={purgeConfirm}
            onChange={(e) => setPurgeConfirm(e.target.value)}
            disabled={activeMode !== 'campus'}
            placeholder="Type DELETE FEST DATA"
            className="h-11 flex-1 min-w-[200px] rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA] disabled:opacity-40"
          />
          <button
            type="button"
            disabled={
              busy ||
              activeMode !== 'campus' ||
              purgeConfirm.trim() !== 'DELETE FEST DATA'
            }
            onClick={() => void runPurge()}
            className="h-11 rounded-xl bg-[#FF4F5E] px-4 text-xs font-extrabold text-white disabled:opacity-40 cursor-pointer"
          >
            Archive &amp; Purge
          </button>
        </div>
      </section>

      {/* Audit Log */}
      <section className="rounded-[22px] border border-[#3B2758] bg-[#1F1230] p-5 space-y-2.5">
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <Activity className="size-5 text-[#FFD60A]" />
          Recent Audit Log
        </h2>
        {auditLogs.map((row) => (
          <div
            key={row.id}
            className="flex justify-between rounded-xl bg-[#12091E] px-3 py-2 text-xs"
          >
            <span>
              <strong className="text-[#FFD60A]">{row.action}</strong>{' '}
              {row.target && <span className="text-[#9C97B0]">· {row.target}</span>}
            </span>
            <span className="text-[#9C97B0]">
              {new Date(row.at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
              })}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
