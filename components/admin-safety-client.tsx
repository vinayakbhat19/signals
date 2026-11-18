'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Bell,
  Eye,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  archiveAndPurgeFestAction,
  resendPushAlertsAction,
  toggleCampusPreviewAction,
  updateAppConfigAction,
} from '@/app/admin/safety/actions';

export interface AuditRow {
  id: number;
  at: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown>;
}

export interface SafetyPanelProps {
  health: {
    db: 'ok' | 'down';
    dbLatencyMs: number | null;
    auth: 'ok' | 'down';
    snapshotAgeS: number | null;
    limiter: string;
    pushQueueCount: number;
    pushDeviceCount: number;
  };
  config: {
    mode: 'fest' | 'campus';
    mode_override: 'auto' | 'fest' | 'campus';
    writes_paused: boolean;
    banner_message: string;
    banner_level: 'info' | 'warning' | 'critical';
    campus_from: string;
    hosts_until: string;
  };
  isCampusPreview: boolean;
  auditLogs: AuditRow[];
  opsSchemaReady: boolean;
}

export function AdminSafetyClient({
  health,
  config,
  isCampusPreview,
  auditLogs,
  opsSchemaReady,
}: SafetyPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [writesPaused, setWritesPaused] = useState(config.writes_paused);
  const [modeOverride, setModeOverride] = useState<'auto' | 'fest' | 'campus'>(
    config.mode_override
  );
  const [bannerMessage, setBannerMessage] = useState(config.banner_message);
  const [bannerLevel, setBannerLevel] = useState<'info' | 'warning' | 'critical'>(
    config.banner_level
  );
  const [purgeInput, setPurgeInput] = useState('');
  const [previewOn, setPreviewOn] = useState(isCampusPreview);

  function saveConfig(nextPaused = writesPaused, nextMode = modeOverride) {
    startTransition(async () => {
      const res = await updateAppConfigAction({
        writes_paused: nextPaused,
        mode_override: nextMode,
        banner_message: bannerMessage.trim() || null,
        banner_level: bannerLevel,
      });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        setWritesPaused(nextPaused);
        setModeOverride(nextMode);
        toast.success('Safety settings saved.');
      }
    });
  }

  function handlePreviewToggle() {
    const next = !previewOn;
    startTransition(async () => {
      await toggleCampusPreviewAction(next);
      setPreviewOn(next);
      toast.success(
        next
          ? 'Campus mode preview ON (only for you).'
          : 'Campus mode preview OFF.'
      );
    });
  }

  function handleResendPush() {
    startTransition(async () => {
      const res = await resendPushAlertsAction();
      toast.success(
        `Processed ${res.processed} queued alert(s), sent ${res.sent}.`
      );
    });
  }

  function handleArchivePurge() {
    startTransition(async () => {
      const res = await archiveAndPurgeFestAction(purgeInput);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(
          `Purged: ${res.votesDeleted} votes, ${res.pushDeleted} push devices, ${res.contactsCleared} participant contacts cleared.`
        );
        setPurgeInput('');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[#F4F2FA]">SAFETY PANEL</h1>
          <p className="text-xs text-[#9C97B0]">
            System health, kill switches, campus mode switch, and audit log
          </p>
        </div>
        <Link
          href="/admin/emergency"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#FF4F5E]/60 bg-[#FF4F5E]/15 px-3.5 text-xs font-extrabold text-[#FF9EA7] hover:bg-[#FF4F5E]/25"
        >
          <ShieldAlert className="size-4" />
          Emergency Mode (PIN)
        </Link>
      </div>

      {!opsSchemaReady && (
        <div className="rounded-2xl border border-[#FFE14D]/60 bg-[#FFE14D]/10 p-4 text-xs text-[#FFE14D]">
          <strong>Setup note:</strong> Run <code>supabase/schema_ops.sql</code>{' '}
          in Supabase SQL Editor to activate persistent kill switches, mode
          switching, rate-limit fallback, push queue, and audit logging.
        </div>
      )}

      {/* Health Tiles */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-3.5">
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">Database</p>
          <p
            className={`mt-1 font-heading text-lg font-extrabold ${
              health.db === 'ok' ? 'text-[#FFD60A]' : 'text-[#FF4F5E]'
            }`}
          >
            {health.db.toUpperCase()}
          </p>
          <p className="text-[11px] text-[#BDB8CF]">
            {health.dbLatencyMs != null ? `${health.dbLatencyMs} ms` : 'offline'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-3.5">
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">Auth</p>
          <p
            className={`mt-1 font-heading text-lg font-extrabold ${
              health.auth === 'ok' ? 'text-[#FFD60A]' : 'text-[#FF4F5E]'
            }`}
          >
            {health.auth.toUpperCase()}
          </p>
          <p className="text-[11px] text-[#BDB8CF]">Supabase GoTrue</p>
        </div>

        <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-3.5">
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">Limiter</p>
          <p className="mt-1 font-heading text-lg font-extrabold text-[#22D3EE]">
            {health.limiter.toUpperCase()}
          </p>
          <p className="text-[11px] text-[#BDB8CF]">
            {health.limiter === 'upstash' ? 'Primary Redis' : 'Backup in use'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-3.5">
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">Snapshot</p>
          <p className="mt-1 font-heading text-lg font-extrabold text-[#F4F2FA]">
            {health.snapshotAgeS != null
              ? `${Math.floor(health.snapshotAgeS / 60)}m`
              : 'N/A'}
          </p>
          <p className="text-[11px] text-[#BDB8CF]">Bundled backup</p>
        </div>

        <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-3.5">
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">Push Queue</p>
          <p className="mt-1 font-heading text-lg font-extrabold text-[#F4F2FA]">
            {health.pushQueueCount}
          </p>
          <p className="text-[11px] text-[#BDB8CF]">
            {health.pushDeviceCount} device(s)
          </p>
        </div>

        <div className="rounded-2xl border border-[#3B2758] bg-[#1F1230] p-3.5">
          <p className="text-[11px] font-bold uppercase text-[#9C97B0]">Active Mode</p>
          <p className="mt-1 font-heading text-lg font-extrabold text-[#FF4FD8]">
            {config.mode.toUpperCase()}
          </p>
          <p className="text-[11px] text-[#BDB8CF]">
            Rule: {config.mode_override}
          </p>
        </div>
      </section>

      {/* Kill Switch + Push Flush */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
              <AlertTriangle className="size-5 text-[#FFE14D]" />
              Votes &amp; Stamps Kill Switch
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${
                writesPaused
                  ? 'bg-[#FF4F5E] text-[#12091E]'
                  : 'bg-[#FFD60A] text-[#12091E]'
              }`}
            >
              {writesPaused ? 'PAUSED' : 'ACTIVE'}
            </span>
          </div>
          <p className="text-xs text-[#BDB8CF]">
            Stops all new votes and stamp claims at the database immediately.
            Schedule browsing stays fast and online.
          </p>
          <button
            type="button"
            disabled={isPending || !opsSchemaReady}
            onClick={() => saveConfig(!writesPaused, modeOverride)}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold cursor-pointer disabled:opacity-50 ${
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
        </div>

        <div className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Bell className="size-5 text-[#22D3EE]" />
            Alert Queue Delivery
          </h2>
          <p className="text-xs text-[#BDB8CF]">
            Manually flush pending Web Push notifications from{' '}
            <code>push_queue</code> to subscribed devices.
          </p>
          <button
            type="button"
            disabled={isPending || !opsSchemaReady}
            onClick={() => handleResendPush()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#22D3EE]/60 bg-[#12091E] text-sm font-extrabold text-[#22D3EE] hover:bg-[#22D3EE] hover:text-[#12091E] disabled:opacity-50 cursor-pointer"
          >
            <Bell className="size-4" />
            Resend alerts ({health.pushQueueCount} pending)
          </button>
        </div>
      </section>

      {/* Top Banner + Mode Control */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
        <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
          Global Banner &amp; App Mode
        </h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-[#BDB8CF]">
              Top banner message (leave empty to hide)
            </label>
            <input
              type="text"
              maxLength={200}
              value={bannerMessage}
              onChange={(e) => setBannerMessage(e.target.value)}
              placeholder="e.g. Heavy rain — StreetPlay moved to Auditorium"
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA] outline-none focus:border-[#FFD60A]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#BDB8CF]">Level</label>
            <select
              value={bannerLevel}
              onChange={(e) =>
                setBannerLevel(
                  e.target.value as 'info' | 'warning' | 'critical'
                )
              }
              className="h-11 w-full rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-sm text-[#F4F2FA]"
            >
              <option value="info">Info (Violet)</option>
              <option value="warning">Warning (Yellow)</option>
              <option value="critical">Critical (Red)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-[#BDB8CF]">
            Fest / Campus Mode (auto-switches at 28 Nov 2026 00:00 IST)
          </p>
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
                {m === 'auto'
                  ? 'Automatic'
                  : m === 'fest'
                    ? 'Force Fest'
                    : 'Force Campus'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            disabled={isPending || !opsSchemaReady}
            onClick={() => saveConfig(writesPaused, modeOverride)}
            className="h-11 rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#12091E] cursor-pointer disabled:opacity-50"
          >
            Save banner &amp; mode
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handlePreviewToggle()}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#9B6CFF] bg-[#12091E] px-4 text-xs font-extrabold text-[#F4F2FA] cursor-pointer"
          >
            <Eye className="size-4 text-[#9B6CFF]" />
            {previewOn
              ? 'Exit Campus Preview'
              : 'Preview Campus Mode (only me)'}
          </button>
        </div>
      </section>

      {/* Post-Fest Archive & Purge */}
      <section className="rounded-[22px] border-[1.5px] border-[#FF4F5E]/40 bg-[#1F1230] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="size-5 text-[#FF4F5E]" />
          <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            After the Fest: Archive Results + Delete Personal Data
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-[#CFCBDD]">
          Keeps final vote totals (<code>poll_results_archive</code>), Stamp Hunt
          leaderboard, and event results. Permanently deletes individual votes,
          push subscriptions, and participant emails/phone numbers. Only enabled
          in <strong>campus mode</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={purgeInput}
            onChange={(e) => setPurgeInput(e.target.value)}
            placeholder="Type DELETE FEST DATA to confirm"
            disabled={config.mode !== 'campus'}
            className="h-11 flex-1 min-w-[220px] rounded-xl border border-[#3B2758] bg-[#12091E] px-3 text-xs text-[#F4F2FA] disabled:opacity-40"
          />
          <button
            type="button"
            disabled={
              isPending ||
              config.mode !== 'campus' ||
              purgeInput.trim() !== 'DELETE FEST DATA'
            }
            onClick={() => handleArchivePurge()}
            className="h-11 rounded-xl bg-[#FF4F5E] px-4 text-xs font-extrabold text-white disabled:opacity-40 cursor-pointer"
          >
            Archive &amp; Purge
          </button>
        </div>
      </section>

      {/* Audit Log */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
          <Activity className="size-5 text-[#FFD60A]" />
          Recent Audit Log
        </h2>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-[#9C97B0]">No audit entries yet.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3B2758] bg-[#12091E] px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-extrabold text-[#FFD60A]">
                    {row.action}
                  </span>{' '}
                  {row.target && (
                    <span className="text-[#BDB8CF]">· {row.target}</span>
                  )}
                </div>
                <span className="text-[11px] text-[#9C97B0]">
                  {new Date(row.at).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
