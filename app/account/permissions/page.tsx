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
  const [notifState, setNotifState] = useState<
    'default' | 'granted' | 'denied' | 'unsupported'
  >('default');
  const [isIosBrowser, setIsIosBrowser] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [topics, setTopics] = useState<string[]>(['changes', 'urgent']);
  const [cameraState, setCameraState] = useState<
    'prompt' | 'granted' | 'denied' | 'unknown'
  >('unknown');
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
          .then((res) => setCameraState(res.state as 'prompt' | 'granted' | 'denied'))
          .catch(() => setCameraState('unknown'));
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  async function enableAlerts() {
    if (isIosBrowser) {
      toast.info(
        'On iPhone, add Fiesta\'26 Live to your Home Screen first, then open the installed app to turn on alerts.'
      );
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
        toast.error('Notifications were blocked. Follow the steps below to enable them.');
        setBusy(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.success('Browser notification permission granted!');
        setSubscribed(true);
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const jsonSub = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: jsonSub.endpoint,
          keys: jsonSub.keys,
          topics,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error || 'Could not save alert settings.');
      } else {
        setSubscribed(true);
        toast.success('Alerts are ON! You will get schedule delays & urgent notices.');
      }
    } catch {
      toast.error('Could not turn on alerts right now.');
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
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
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

  function rememberNotNow() {
    try {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(NOT_NOW_KEY, String(Date.now() + sevenDaysMs));
    } catch {
      // Ignore storage error
    }
    toast.info('Got it — we will not ask again for 7 days.');
  }

  function toggleTopic(topic: string) {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          aria-label="Back to account"
          className="flex size-11 items-center justify-center rounded-[14px] border border-[#3B2758] bg-[#1F1230] text-[#F4F2FA]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-[#F4F2FA]">
            ALERTS &amp; CAMERA
          </h1>
          <p className="text-xs text-[#9C97B0]">
            Optional permissions — we never ask on page load
          </p>
        </div>
      </div>

      {/* Push Alerts Section */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-[#FFD60A]" />
            <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
              Schedule &amp; Urgent Alerts
            </h2>
          </div>
          <span className="rounded-full bg-[#2A1840] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#FFD60A]">
            {subscribed
              ? 'ON'
              : notifState === 'denied'
                ? 'BLOCKED'
                : 'OFF'}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-[#CFCBDD]">
          Get a phone alert when an event is delayed, changes venue, or an
          urgent fest notice is posted. Max 6 alerts per hour; we never collect
          location or contacts.
        </p>

        {isIosBrowser && (
          <div className="rounded-2xl border border-[#FFE14D]/60 bg-[#12091E] p-3.5 text-xs text-[#FFE14D] space-y-1">
            <p className="flex items-center gap-1.5 font-extrabold">
              <Smartphone className="size-4" />
              iPhone requires Add to Home Screen
            </p>
            <p className="text-[#CFCBDD]">
              Tap the <strong>Share</strong> icon in Safari →{' '}
              <strong>Add to Home Screen</strong> → open Fiesta&apos;26 Live from
              your Home Screen to turn on alerts.
            </p>
            <Link
              href="/install"
              className="inline-block pt-1 font-bold text-[#FFD60A] underline"
            >
              See step-by-step install guide →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'changes', label: 'Time & room changes' },
            { id: 'urgent', label: 'Urgent notices' },
            { id: 'vote', label: 'Voting opens' },
            { id: 'hunt', label: 'Stamp Hunt' },
          ].map((item) => {
            const active = topics.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleTopic(item.id)}
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

        {notifState === 'denied' ? (
          <div className="rounded-2xl border border-[#FF4F5E]/50 bg-[#12091E] p-3.5 text-xs text-[#CFCBDD] space-y-1.5">
            <p className="font-extrabold text-[#FF9EA7]">
              Notifications are blocked in your browser settings
            </p>
            <p>
              <strong>Android Chrome:</strong> tap the lock/tune icon in the
              address bar → Permissions → Notifications → Allow.
            </p>
            <p>
              <strong>iPhone:</strong> Settings → Notifications → Fiesta&apos;26
              Live → Allow Notifications.
            </p>
          </div>
        ) : subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disableAlerts()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#3B2758] bg-[#12091E] text-xs font-extrabold text-[#F4F2FA] cursor-pointer"
          >
            <BellOff className="size-4" />
            Turn off alerts on this device
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enableAlerts()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#FFD60A] text-sm font-extrabold text-[#12091E] shadow-[4px_4px_0_#FF4FD8] cursor-pointer"
            >
              Turn on alerts
            </button>
            <button
              type="button"
              onClick={rememberNotNow}
              className="h-12 rounded-[16px] border border-[#3B2758] px-4 text-xs font-bold text-[#BDB8CF] cursor-pointer"
            >
              Not now
            </button>
          </div>
        )}
      </section>

      {/* Camera Section */}
      <section className="rounded-[22px] border-[1.5px] border-[#3B2758] bg-[#1F1230] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-[#22D3EE]" />
            <h2 className="font-heading text-lg font-extrabold text-[#F4F2FA]">
              Camera (QR Scanner)
            </h2>
          </div>
          <span className="rounded-full bg-[#2A1840] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#22D3EE]">
            {cameraState}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-[#CFCBDD]">
          Used only while scanning Stamp Hunt or voting QRs on{' '}
          <Link href="/scan" className="font-bold text-[#FFD60A] underline">
            /scan
          </Link>
          . Frames are decoded locally on your phone and never uploaded. Camera
          turns off automatically when you leave the page.
        </p>

        <div className="rounded-2xl border border-[#3B2758] bg-[#12091E] p-3.5 text-xs text-[#BDB8CF] space-y-1.5">
          <p className="font-bold text-[#F4F2FA]">
            If camera permission is blocked:
          </p>
          <p>
            <strong>Android Chrome:</strong> lock/tune icon in address bar →
            Permissions → Camera → Allow.
          </p>
          <p>
            <strong>iPhone Safari:</strong> tap <code>aA</code> menu → Website
            Settings → Camera → Allow (installed iPhone apps may ask again each
            session).
          </p>
          <p className="text-[#FFD60A]">
            No camera? You can always use &ldquo;Take a photo of the QR&rdquo;
            or &ldquo;Enter a code&rdquo; on the scanner screen.
          </p>
        </div>
      </section>
    </div>
  );
}
