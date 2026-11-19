# Permissions and notifications

Screen: **08 Alerts and camera** (`design/png/08-permissions.png`). Prompt: **N.1**. Database: `push_subscriptions`, `push_queue` (`schema_ops.sql`).

## Principles
1. **Never ask on page load.** Browsers remember a "Block" for good, and a blocked app can't ask again. Ask only after a tap, with a clear reason first (the "primer" screen).
2. Ask **once**. "Not now" is remembered for 7 days.
3. Show the real state: not asked, on, blocked (with the steps to fix it).
4. Alerts are **best effort**. The Home alert and `/updates` page are the source of truth. Also announce on stage and WhatsApp.
5. We never ask for **location** or contacts.

## Notifications (Web Push)

| Item | Decision |
| --- | --- |
| Technology | Web Push: service worker + Push API + VAPID keys. Library `web-push` on the server |
| Keys | Generate once: `npx web-push generate-vapid-keys`. Public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; private key → `VAPID_PRIVATE_KEY`; `VAPID_SUBJECT=mailto:<committee email>` |
| **iPhone** | Push works **only when the site is added to the Home Screen** (iOS/iPadOS 16.4 or newer). On iPhone Safari outside the installed app, the "Turn on alerts" button shows the Add to Home Screen steps instead |
| Android | Works in Chrome, in the browser or installed |
| Topics | `changes` (default), `urgent` (default), `vote`, `hunt`, `event:<id>`. Students can switch topics off |
| What triggers an alert | A change to an event's time, venue or status (`event_changes` → `push_queue`), or an **urgent** announcement. Normal announcements don't push |
| Content | Title "Fiesta'26 update", body = the ready-made change message, tap opens `/events/<id>`; one alert per event is replaced by the next (notification `tag`) |
| Frequency cap | At most 6 alerts per device per hour; TTL 1 hour (a late alert is useless) |
| Delivery | A small **Cloudflare Worker** (cron every minute, the only server code) reads unsent `push_queue` rows with the service-role key (a Worker secret) and sends them in batches. Backup: the **Resend alerts** button on the Safety panel |
| Cleanup | Delete a subscription on HTTP 404/410 from the push service; after 5 failures; and all of them at the end of the fest (purge) |
| Privacy | The tables have **no client access**. The browser subscribes through `save_push_subscription` (signed-in only, 5 devices per person, rate limited) and unsubscribes through `remove_push_subscription`; only the Worker reads the tables |

Alert wording examples:
- "Intro to Flutter Workshop now starts at 6:15 PM (was 6:00 PM)"
- "Solo Singing moved to Open Air Theatre (was Main Stage)"
- "Treasure Hunt is cancelled"
- Urgent: "Main gate closed after 9 PM. Use Gate 2."

## Camera (QR scanner)

| Item | Decision |
| --- | --- |
| When | Only after the user taps **Open camera** on `/scan` (or the SCAN button then Open camera) |
| How | `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`; HTTPS only |
| Privacy | The tables have **no client access**. The browser subscribes through `save_push_subscription` (signed-in only, 5 devices per person, rate limited) and unsubscribes through `remove_push_subscription`; only the Worker reads the tables |
| Header | `Permissions-Policy: camera=(self)` |
| States | **granted** → scan; **denied** → steps to allow (Chrome Android: lock/tune icon → Permissions → Camera → Allow; iPhone: Settings → Safari → Camera, or `aA` menu → Website Settings); **no camera** or old browser → fallbacks |
| Fallbacks | 1) "Take a photo of the QR" using `<input type="file" accept="image/*" capture="environment">`, decoded in the browser; 2) "Enter a code" |
| iPhone note | An installed iPhone web app may ask for the camera again each time it opens. Mention it in the help text |

## Sign-in (no Google)
Sign-in is email + password with a 6-digit code to verify the email (`AUTH_EMAIL_OTP.md`). Because the code is typed on the app page, it works inside Instagram, WhatsApp and every other in-app browser, so no special warning sheet is needed.
- Anyone can sign up with an email and vote; nothing else is verified.

## Where permissions are offered in the flow
- After email confirmation (screen 05): "Get alerts for delays and changes" link → screen 08.
- Updates page (15): "Get these as phone alerts".
- Account (14) → **Alerts and camera**.
- Scanner (20) → "Camera not working?" → screen 08.
- After the user adds the app to the Home Screen (iPhone) → a one-time prompt to turn alerts on.
