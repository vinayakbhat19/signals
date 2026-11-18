'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

const NOT_NOW_KEY = 'fiesta26_push_not_now_until';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PermissionsPage() {
  const { user } = useAuth();
  const [notifState, setNotifState] = useState<
    'default' | 'granted' | 'denied' | 'unsupported'
  >('default');
  const [isIosBrowser, setIsIosBrowser] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [topics, setTopics] = useState<string[]>(['changes', 'urgent']);
  const [cameraState, setCameraState] = useState<string>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const ua = navigator.userAgent;
      const isIos = /iPad|iPhone|iPod/.test(ua);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsIosBrowser(isIos && !isStandalone);

      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
        setNotifState('unsupported');
      } else {
        setNotifState(Notification.permission);
        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => setSubscribed(Boolean(sub)))
            .catch(() => {});
        }
      }

      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: 'camera' as PermissionName })
          .then((res) => setCameraState(res.state))
          .catch(() => setCameraState('unknown'));
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  async function enableAlerts() {
    if (!user) {
      toast.info('Sign in first so we can save your alert preferences.');
      return;
    }
    if (isIosBrowser) {
      toast.info('Add Fiesta\'26 Live to your iPhone Home Screen first, then open it to enable alerts.');
      return;
    }
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      toast.error('This browser does not support push alerts.');
      return;
    }

    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setNotifState(perm);
      if (perm !== 'granted') {
        toast.error('Notifications blocked in browser settings.');
        setBusy(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setSubscribed(true);
        toast.success('Notification permission granted!');
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const jsonSub = sub.toJSON();
      const supabase = createClient();
      const { data, error } = await supabase.rpc('save_push_subscription', {
        p_endpoint: jsonSub.endpoint,
        p_p256dh: jsonSub.keys?.p256dh ?? '',
        p_auth: jsonSub.keys?.auth ?? '',
        p_topics: topics,
      });

      if (error || !(data as { ok?: boolean } | null)?.ok) {
        toast.error(
          (data as { message?: string } | null)?.message ||
            error?.message ||
            'Could not save subscription.'
        );
      } else {
        setSubscribed(true);
        toast.success('Alerts are ON!');
      }
    } catch {
      toast.error('Could not enable alerts right now.');
    } finally {
      setBusy(false);
    }
  }

  async function disableAlerts() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const supabase = createClient();
        await supabase.rpc('remove_push_subscription', {
          p_endpoint: sub.endpoint,
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success('Alerts turned off on this device.');
    } catch {
      toast.error('Failed to turn off alerts.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/account/"
          className="flex size-11 items-center justify-center rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-[#F4F2FA]">
            ALERTS &amp; CAMERA
          </h1>
          <p className="text-xs text-[#9C97B0]">
            Optional permissions — never requested on page load
          </p>
        </div>
      </div>

      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#F4F2FA]">
            <Bell className="size-5 text-[#FFD60A]" />
            Schedule &amp; Urgent Alerts
          </h2>
          <span className="rounded-full bg-[#2A1840] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#FFD60A]">
            {subscribed ? 'ON' : notifState === 'denied' ? 'BLOCKED' : 'OFF'}
          </span>
        </div>

        {isIosBrowser && (
          <div className="rounded-2xl border border-[#FFE14D]/60 bg-[#12091E] p-3.5 text-xs text-[#FFE14D] space-y-1">
            <p className="flex items-center gap-1.5 font-extrabold">
              <Smartphone className="size-4" />
              iPhone requires Add to Home Screen
            </p>
            <p className="text-[#CFCBDD]">
              Share → Add to Home Screen → open the installed app to turn on
              alerts.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'changes', label: 'Time & room changes' },
            { id: 'urgent', label: 'Urgent notices' },
            { id: 'vote', label: 'Voting opens' },
            { id: 'hunt', label: 'Treasure Hunt' },
          ].map((item) => {
            const active = topics.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setTopics((p) =>
                    p.includes(item.id)
                      ? p.filter((x) => x !== item.id)
                      : [...p, item.id]
                  )
                }
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold cursor-pointer ${
                  active
                    ? 'border-[#FFD60A] bg-[#FFD60A]/15 text-[#FFD60A]'
                    : 'border-[#3B2758] bg-[#12091E] text-[#9C97B0]'
                }`}
              >
                <CheckCircle2 className="size-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disableAlerts()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#3B2758] bg-[#12091E] text-xs font-extrabold text-[#F4F2FA] cursor-pointer"
          >
            <BellOff className="size-4" />
            Turn off alerts
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enableAlerts()}
              className="flex h-12 flex-1 items-center justify-center rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
            >
              Turn on alerts
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(
                    NOT_NOW_KEY,
                    String(Date.now() + 7 * 86400 * 1000)
                  );
                } catch {}
                toast.info('Got it — we will not ask for 7 days.');
              }}
              className="h-12 rounded-[16px] border border-[#3B2758] px-4 text-xs font-bold text-[#BDB8CF] cursor-pointer"
            >
              Not now
            </button>
          </div>
        )}
      </section>

      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-2.5 text-xs text-[#CFCBDD]">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-base font-extrabold text-[#F4F2FA]">
            <Camera className="size-5 text-[#22D3EE]" />
            Camera (QR Scanner)
          </h2>
          <span className="rounded-full bg-[#2A1840] px-2.5 py-0.5 font-extrabold uppercase text-[#22D3EE]">
            {cameraState}
          </span>
        </div>
        <p>
          Camera only starts after you tap &ldquo;Open camera&rdquo; on{' '}
          <Link href="/scan/" className="font-bold text-[#FFD60A] underline">
            /scan/
          </Link>{' '}
          and stops immediately when you leave the page.
        </p>
      </section>
    </div>
  );
}
