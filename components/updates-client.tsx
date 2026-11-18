'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Check,
  Clock,
  MapPin,
  Megaphone,
  X,
} from 'lucide-react';
import type { AnnouncementWithEvent } from '@/lib/data/announcements';
import type { EventChangeWithEvent } from '@/lib/data/changes';
import { formatTime, formatTimeAgo } from '@/lib/time';
import type { EventChangeKind } from '@/lib/types';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'changes' | 'notices';

type UnifiedUpdate =
  | { kind: 'notice'; created_at: string; item: AnnouncementWithEvent }
  | { kind: 'change'; created_at: string; item: EventChangeWithEvent };

function changeMeta(kind: EventChangeKind): {
  label: string;
  accent: string;
  border: string;
  iconBg: string;
} {
  switch (kind) {
    case 'time_venue':
      return {
        label: 'TIME AND VENUE CHANGED',
        accent: '#FFE14D',
        border: '#FFE14D',
        iconBg: '#FFE14D',
      };
    case 'time':
      return {
        label: 'TIME CHANGED',
        accent: '#FFE14D',
        border: '#FFE14D',
        iconBg: '#FFE14D',
      };
    case 'venue':
      return {
        label: 'VENUE CHANGED',
        accent: '#22D3EE',
        border: '#22D3EE',
        iconBg: '#22D3EE',
      };
    case 'cancelled':
      return {
        label: 'CANCELLED',
        accent: '#FF7D88',
        border: '#FF4F5E',
        iconBg: '#FF4F5E',
      };
    case 'restored':
      return {
        label: 'BACK ON',
        accent: '#C6FF3D',
        border: '#C6FF3D',
        iconBg: '#C6FF3D',
      };
  }
}

function ChangeIcon({ kind }: { kind: EventChangeKind }) {
  if (kind === 'cancelled') {
    return <X className="size-5 stroke-[2.6] text-[#0B0A12]" aria-hidden="true" />;
  }
  if (kind === 'venue') {
    return <MapPin className="size-5 stroke-[2.4] text-[#0B0A12]" aria-hidden="true" />;
  }
  if (kind === 'restored') {
    return <Check className="size-5 stroke-[2.6] text-[#0B0A12]" aria-hidden="true" />;
  }
  return <Clock className="size-5 stroke-[2.4] text-[#0B0A12]" aria-hidden="true" />;
}

interface UpdatesClientProps {
  announcements: AnnouncementWithEvent[];
  changes: EventChangeWithEvent[];
  serverTime: string;
}

export function UpdatesClient({
  announcements,
  changes,
  serverTime,
}: UpdatesClientProps) {
  const [tab, setTab] = useState<FilterTab>('all');

  const now = new Date(serverTime);

  const pinnedUrgent = announcements.filter((a) => a.priority === 'urgent');
  const normalNotices = announcements.filter((a) => a.priority !== 'urgent');

  const feed: UnifiedUpdate[] = [
    ...normalNotices.map((item) => ({
      kind: 'notice' as const,
      created_at: item.created_at,
      item,
    })),
    ...changes.map((item) => ({
      kind: 'change' as const,
      created_at: item.created_at,
      item,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const visibleUrgent = tab === 'changes' ? [] : pinnedUrgent;
  const visibleFeed = feed.filter((entry) => {
    if (tab === 'changes') return entry.kind === 'change';
    if (tab === 'notices') return entry.kind === 'notice';
    return true;
  });

  const totalAll = announcements.length + changes.length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header matching 15-notices.png */}
      <header className="flex items-center gap-3 pt-1">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] text-[#F4F2FA] hover:border-[#C6FF3D]"
        >
          <ArrowLeft className="size-5 stroke-[2.4]" aria-hidden="true" />
        </Link>
        <h1 className="flex-1 font-heading text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#F4F2FA]">
          Updates
        </h1>
        <Bell
          className="bell-ring size-8 text-[#FFE14D] stroke-[2.2]"
          aria-hidden="true"
        />
      </header>

      {/* 3-tab segmented switcher */}
      <div
        role="tablist"
        aria-label="Filter updates"
        className="grid grid-cols-3 gap-1 rounded-[14px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] p-1"
      >
        {(
          [
            { id: 'all', label: `All (${totalAll})` },
            { id: 'changes', label: `Changes (${changes.length})` },
            { id: 'notices', label: `Notices (${announcements.length})` },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                'h-[38px] rounded-[10px] text-[13px] transition-colors cursor-pointer',
                active
                  ? 'bg-[#C6FF3D] font-extrabold text-[#0B0A12]'
                  : 'font-semibold text-[#BDB8CF] hover:text-[#F4F2FA]'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Feed list */}
      {visibleUrgent.length > 0 || visibleFeed.length > 0 ? (
        <ol className="space-y-2.5">
          {/* Pinned urgent notices first (coral-red card matching 15-notices.png) */}
          {visibleUrgent.map((notice) => (
            <li
              key={`urgent-${notice.id}`}
              className="flex flex-col gap-1.5 rounded-[20px] bg-[#FF4F5E] px-4 py-3.5 text-[#0B0A12] shadow-[4px_4px_0_#FFE14D]"
            >
              <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.1em]">
                <span className="live-dot size-2 rounded-full bg-[#0B0A12]" />
                IMPORTANT NOTICE · PINNED ·{' '}
                {formatTimeAgo(notice.created_at, now).toUpperCase()}
              </span>
              <span className="whitespace-pre-line text-[16px] font-extrabold leading-snug">
                {notice.message}
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span>From the Fest Committee</span>
                {notice.event_id && (
                  <Link
                    href={`/events/${notice.event_id}`}
                    className="underline underline-offset-4 text-[#0B0A12]"
                  >
                    {notice.event_title ?? 'View event'} →
                  </Link>
                )}
              </div>
            </li>
          ))}

          {/* Chronological stream of auto-logged changes & normal notices */}
          {visibleFeed.map((entry) => {
            if (entry.kind === 'change') {
              const change = entry.item;
              const meta = changeMeta(change.kind);
              const newSummary = [
                change.new_starts_at ? formatTime(change.new_starts_at) : null,
                change.new_venue,
              ]
                .filter(Boolean)
                .join(' · ');
              const oldSummary = [
                change.old_starts_at ? formatTime(change.old_starts_at) : null,
                change.old_venue,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <li key={`change-${change.id}`}>
                  <Link
                    href={`/events/${change.event_id}`}
                    className="flex gap-3 rounded-[20px] border-[1.5px] bg-[#16141F] px-4 py-3.5 text-[#F4F2FA] transition-opacity hover:opacity-95"
                    style={{ borderColor: meta.border }}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
                      style={{ backgroundColor: meta.iconBg }}
                    >
                      <ChangeIcon kind={change.kind} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span
                        className="text-[11px] font-extrabold uppercase tracking-[0.1em]"
                        style={{ color: meta.accent }}
                      >
                        {meta.label} ·{' '}
                        {formatTimeAgo(change.created_at, now).toUpperCase()}
                      </span>
                      <strong className="text-[16px] font-extrabold leading-snug text-[#F4F2FA]">
                        {change.event_title}
                      </strong>
                      {change.kind === 'cancelled' || change.kind === 'restored' ? (
                        <span className="text-sm text-[#CFCBDD]">
                          {change.message}
                        </span>
                      ) : (
                        <>
                          {newSummary && (
                            <span className="text-sm text-[#CFCBDD]">
                              Now{' '}
                              <strong className="text-[#F4F2FA]">
                                {newSummary}
                              </strong>
                            </span>
                          )}
                          {oldSummary && oldSummary !== newSummary && (
                            <span className="text-[13px] text-[#8A8599] line-through">
                              {oldSummary}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              );
            }

            const notice = entry.item;
            return (
              <li
                key={`notice-${notice.id}`}
                className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-[#2E2A3D] bg-[#16141F] px-4 py-3.5"
              >
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9C97B0]">
                  NOTICE · {formatTimeAgo(notice.created_at, now).toUpperCase()}
                </span>
                <p className="whitespace-pre-line text-[15px] leading-snug text-[#F4F2FA]">
                  {notice.message}
                </p>
                {notice.event_id && (
                  <Link
                    href={`/events/${notice.event_id}`}
                    className="mt-0.5 text-xs font-extrabold text-[#C6FF3D] hover:underline underline-offset-4"
                  >
                    {notice.event_title ?? 'View linked event'} →
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-[#2E2A3D] bg-[#16141F]/50 px-6 py-12 text-center">
          <Megaphone className="size-6 text-[#9C97B0]" aria-hidden="true" />
          <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
            No updates in this tab yet
          </h2>
          <p className="max-w-xs text-sm text-[#9C97B0]">
            Time changes, venue moves, cancellations, and committee notices
            appear here automatically.
          </p>
        </div>
      )}

      <p className="pt-2 text-center text-xs text-[#9C97B0]">
        Changes to time, venue or cancellations appear here automatically
      </p>
    </div>
  );
}
