# Peak load: 2,000 people at the same time

**Target:** 2,000 people using the app at once, at the moments when it matters most: registration opening, voting, and while a competition is on. This document says when the load comes, what breaks first, what we do about it, and what was measured.

## 1. When the load comes

| # | Peak | When | What 2,000 people do | What gets hit |
| --- | --- | --- | --- | --- |
| P1 | **Gate rush** | Morning of 25 Nov, and before big events | Scan the poster QR, open the app, **sign up or sign in** (about 2,000 accounts in 15–30 min, with a spike when a announcement is made) | Sign-in/sign-up (Supabase Auth), confirmation emails, Google OAuth |
| P2 | **Registration opening** | When a host opens a form and announces it | Open the event page and tap **Register**. The forms are Google Forms, so the form load is Google's; ours is the event page (cached) | Event pages at the CDN |
| P3 | **Competition on** | Every competition start and every delay | Open Events / Updates / line-up, refresh; delay alerts reach about 800+ devices at once | `/api/live`, line-up, push fan-out |
| P4 | **Voting** | After each outdoor performance | Open the event page and tap **Vote** (no QR scan), vote within about a minute (**1,000+ votes in 60 s**), then watch the results | Event page, vote page, `cast_vote`, results polling |
| P5 | **Stamp rush** | When big events end | Scan stamp QRs at the same stations | `claim_stamp`, leaderboard |
| P6 | **Results** | Announcement time | Open leaderboard and results | Leaderboard, results (cached) |

## 2. What was measured (database only)

Local Postgres 16 on a 4-core machine, using the real `cast_vote` and the **earlier** (rotating-code) version of `claim_stamp`; the new static-code `claim_stamp` does less work (no hashing), but was not re-run under load, 40 parallel connections, 2,000 different students:

| Test | Result |
| --- | --- |
| 2,000 distinct voters voting | **all 2,000 counted once, 0 failures, about 5,100 votes per second**, 7.8 ms average |
| 2,000 distinct students collecting a stamp | **2,000 stored, 0 failures, about 4,400 per second**, 9 ms average |
| 150 connections hitting `cast_vote` at once | no failures, 38 ms average |
| Live vote results at 2,000 votes | about 1 ms |
| Stamp Hunt leaderboard top 20 over 14,000 stamps | about 4 ms |

**What this means:** the database is not the bottleneck. Our worst burst is about 20–35 votes per second, more than 100 times below what the functions can do here. **Caveats:** this is a bigger machine than a small Supabase instance, with no network, no API layer and no Supabase limits in the way. It tells us the **function cost is tiny**; it does not prove the whole stack. That is what the load tests in section 7 are for.

## 3. What breaks first (ranked) and what we do

| # | Risk | Why it matters at 2,000 people | Fix |
| --- | --- | --- | --- |
| 1 | **Per-IP rate limits behind a shared IP** | On campus Wi-Fi, and on mobile carriers, hundreds of students share **one public IP**. A limit like "120 requests per minute per IP" would lock out the whole campus | IP limits are only **generous flood guards** (thousands per minute). Real limits are **per account, per email or per device**. Never rate-limit reads by IP |
| 2 | **Supabase Auth limits, and server-side auth calls** | Auth rate limits are per IP. If sign-in runs on our server (Vercel), Supabase sees the **same few Vercel IPs for everybody** and rejects most users. Token refreshes from middleware do the same | Do sign-up, sign-in, reset and resend **from the browser** (the user's own IP). Raise the Auth rate limits in the Supabase dashboard for the fest week (some are only adjustable on paid plans; check). Set the session token (JWT) lifetime to about 4 hours so there are far fewer refreshes. Test this with the `signin` scenario against the real deployment |
| 3 | **Confirmation email quotas** | 2,000 email sign-ups in an hour means about 2,000 emails. Free email plans allow only some tens or hundreds a day; Supabase's own email limit is low | **Google sign-in is the main path** (no email at all). Email + password is the fallback, sent through a single-address sender (Brevo free or Gmail app password: only a few hundred a day). Raise the Auth email limit to match, keep Confirm email ON, and never rely on the built-in sender. If you need thousands of confirmation emails a day you need a domain-based sender |
| 4 | **Supabase compute and API throughput** | The free/smallest compute is shared. 35 writes per second is easy for the functions, but the API layer and CPU are small | Upgrade the project to a paid plan with at least a Small compute for the fest week (check current pricing; budget a few thousand rupees), and drop back on 28 Nov. Use the pooled connection string if anything connects directly |
| 5 | **Realtime / websockets** | Supabase Realtime limits concurrent connections (a few hundred on small plans) | **Do not use Realtime for students.** Polling through the cached `/api/live` instead |
| 6 | **Vercel plan limits** | Function time, invocations, bandwidth (images!). Push fan-out to 2,000 devices can take longer than a short function limit | Use the Pro plan for the fest week. Set `maxDuration` for the push route (60 s). Keep images small (see section 4). Static/ISR pages for everything public |
| 7 | **Upstash free limits** | Rate-limit checks use commands; the free plan has a daily command cap | Only rate-limit **writes and auth** (not reads). Pay-as-you-go for the fest week, or let the database limiter take over (already built: `rate_hit`) |
| 8 | **Thundering herd** | If every phone polls on the same second (for example just after an alert), the load comes in waves | **Jitter** every poll interval by ±30%, and every retry |
| 9 | **Cold starts and cache misses** | The first requests after a deploy or a quiet period are slow | **Warm the cache** 15 minutes before each peak (open the key pages and endpoints), freeze deploys during the fest |

## 4. Rules the app must follow (these keep the peaks cheap)

1. **Public pages are static or ISR** (home shell, events, event pages, line-ups, results, archive): served from the CDN; organiser saves refresh them instantly. 2,000 readers ≈ a handful of origin requests.
2. **One combined feed:** `/api/live` returns now, next, changes, urgent notices, app status and open polls in **one** request. The app never makes five small calls where one will do.
3. **One poll loop per device**, every 20 s (10 s on a live-score page), **with ±30% jitter**, paused when the tab is hidden, exponential backoff on errors (up to 60 s).
4. **No Realtime / websockets** for students.
5. **Writes are one function call** (`cast_vote`, `claim_stamp`), idempotent, with retry + jitter on 429/5xx. A double tap or a retry can never count twice.
6. **Do not compute on read:** results and leaderboard come from a cached endpoint (5 s for votes, 15 s for the leaderboard), refreshed when something changes.
7. **Image budget:** event covers are resized on upload to 1600 px, served as WebP thumbnails (about 20–40 KB) with `next/image` and long cache; the list never loads full-size images. Mascots are inline SVG.
8. **Small JavaScript:** under 200 KB gzip on public pages; no analytics that slows the page; fonts preloaded.
9. **Push fan-out** runs in batches with limited concurrency (about 50 at a time), 5 s timeout per device, and continues from `push_queue` if a function times out. At most 6 alerts per device per hour.
10. **Degrade, don't fail:** when something is slow, show the last data with "Updated 2 min ago" instead of an error.
11. **Registration windows:** events can have `registration_opens_at` and `registration_closes_at`. The Register button shows "Opens at 6:00 PM" (with a countdown), "Register" (opens the form in a new tab) or "Registration closed". The window is set by the **host**, and also switch the Google Form's "Accepting responses" accordingly.

## 5. Per-peak plan

| Peak | What the system does | What you do |
| --- | --- | --- |
| P1 Gate rush | Google sign-in first; email as fallback; sign-in calls from the browser; Turnstile against bots; token life 4 h | Raise Auth limits and email plan **before** 25 Nov; put volunteers at the gate with the "Continue with Google" instruction; keep Instagram/WhatsApp in-app browser help visible |
| P2 Registration | Event pages from the CDN; Register button state from the host's window | Host opens the Google Form and sets the window at the same time; avoid announcing two registrations in the same minute |
| P3 Competition on | Change alerts go out automatically; `/api/live` cached 15 s; push in batches | Delay with one tap (the host does it); expect a wave of refreshes within 20 s |
| P4 Voting | Event page → Vote button → static vote shell + one API; vote = one RPC; results cached 5 s | Start voting 2 minutes after the performance ends, not exactly when it ends; warm the pages before |
| P5 Stamps | One RPC with static stickers; no live screens to keep running; leaderboard cached 15 s | Spread the 10 places so people don't queue at one |
| P6 Results | Leaderboard and archive cached | — |

## 6. Fest-week scaling checklist (do on 23 Nov, undo on 28 Nov)
- [ ] Supabase: paid plan with at least Small compute; Auth rate limits raised (sign-in/up, token refresh, email); JWT lifetime about 4 h; custom SMTP sender working (limits known); Google sign-in as the main button.
- [ ] Vercel: Pro plan; `maxDuration` 60 s on `/api/push/*`; Firewall rule on writes only, per-IP limit high (thousands per minute); Attack Challenge Mode ready but **off**.
- [ ] Upstash: pay-as-you-go or confirm the database fallback works (kill test).
- [ ] Cloudflare Turnstile on sign-up and reset.
- [ ] Cache warming script ready (open `/`, `/events`, each event page, `/api/live`, `/api/vote/<id>`).
- [ ] Dashboards open on the owner's laptop: Vercel, Supabase (API requests, CPU), Upstash, email provider, uptime monitor.
- [ ] Spend alerts set so a surprise bill doesn't happen.
- [ ] After the fest: downgrade plans, rotate keys, run archive and purge.

## 7. Load tests (before the student test)
Scripts: `loadtest/k6-peaks.mjs` and `loadtest/create-test-users.mjs` (see `loadtest/README.md`). Against a preview deployment and a **staging** Supabase project:

| Scenario | Load | Pass |
| --- | --- | --- |
| `readers` | up to 2,000 virtual users for 10 min, polling `/api/live` every ~15 s and vote results every ~45 s | p95 under 800 ms, errors under 1%, Supabase read requests stay low (cache works) |
| `signin` | 2,000 sign-ins in 15 min, with 15 per second for 1 minute | no 429 for legitimate users, sign-in p95 under 2.5 s |
| `vote` | 1,200 votes in 60 s | 1,200 counted, none lost, write p95 under 1.5 s |
| `registration` | 400 requests per second on one event page for 30 s | p95 under 800 ms, all 200 |
| Push fan-out | one delay with 800–2,000 test subscriptions | all sent within 60 s, none duplicated |

If a scenario fails, fix the cause in section 3 and rerun. Do not test with students until all pass.
