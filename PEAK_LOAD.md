# Peak load: 2,000 people at the same time

**Target:** 2,000 people using the app at once, at the moments when it matters most: registration opening, voting, and while a competition is on. **Hosting is free** (Cloudflare Pages + Supabase free plan, see `HOSTING_CLOUDFLARE.md`), so this document also says what the free limits allow.

## 1. When the load comes

| # | Peak | When | What 2,000 people do | What gets hit |
| --- | --- | --- | --- | --- |
| P1 | **Gate rush** | Morning of 25 Nov, and before big events | Scan the poster QR, open the app, **sign up or sign in** (about 2,000 accounts in 15-30 min) | Static files (free, unlimited), Supabase Auth, **the 6-digit code emails** |
| P2 | **Registration opening** | When a host opens a form and announces it | Open the event page and tap **Register**. The forms are Google Forms, so the form load is Google's | Static files, one `live_feed` call |
| P3 | **Competition on** | Every competition start and every delay | Open Events / Updates / line-up; delay alerts reach about 800+ devices at once | `app_status`, `live_feed`, push Worker |
| P4 | **Voting** | After each outdoor performance | Open the event page, tap **Vote** (no QR scan), vote within about a minute (**1,000+ votes in 60 s**), then watch the results | `cast_vote`, `poll_results` every 10 s |
| P5 | **Hunt** | All day | Read clues, scan a sticker at each place | `my_hunt`, `claim_stamp`, leaderboard every 30 s |
| P6 | **Results** | Announcement time | Open leaderboard and results | Leaderboard, results |

## 2. What was measured (database only)

Local Postgres 16 on a 4-core machine, using the real `cast_vote` and the **earlier** (rotating-code) version of `claim_stamp`; the new static-code `claim_stamp` does less work (no hashing) but was not re-run under load. 40 parallel connections, 2,000 different students:

| Test | Result |
| --- | --- |
| 2,000 distinct voters voting | **all 2,000 counted once, 0 failures, about 5,100 votes per second**, 7.8 ms average |
| 2,000 distinct students collecting a stamp | **2,000 stored, 0 failures, about 4,400 per second**, 9 ms average |
| 150 connections hitting `cast_vote` at once | no failures, 38 ms average |
| Live vote results at 2,000 votes | about 1 ms |
| Stamp Hunt leaderboard top 20 over 14,000 stamps | about 4 ms |
| `live_feed()` for 6 events | about 4 KB of JSON |

**What this means:** the database functions are cheap. It does **not** prove the free Supabase plan can serve 2,000 phones: that plan has a small shared server, no published request cap, and 5 GB of egress a month. Test it (section 7).

## 3. What breaks first on the free stack (ranked) and what we do

| # | Risk | Why it matters | Fix |
| --- | --- | --- | --- |
| 1 | **Supabase egress (5 GB a month)** | Every call and every image sent from Supabase counts. 2,000 phones polling hard would burn it | Phones call only the tiny `app_status` (every `poll_seconds`, default 30, jittered) and fetch `live_feed` only when the **version** changes. Images are 15 KB thumbnails with a one-year cache; known covers live in the website files (Cloudflare, free). The **Polling slider** in the Safety panel slows everyone down without a redeploy. Rough estimate (not measured): about 3 GB over the fest |
| 2 | **Supabase free compute and connection limits** | Small shared CPU; the number of requests per second it sustains is not published | The calls are tiny and mostly indexed reads. **Run the load test on a staging project first.** If it struggles: raise `poll_seconds`, cut `poll_results` to every 20 s, stagger announcements |
| 3 | **Supabase Auth limits** | Auth rate limits are per IP and the campus shares one IP | Sign-in runs **from the browser** (the user's own IP). Raise the Auth rate limits in the dashboard (some may be locked on the free plan: check); session lifetime about 4 h so there are few refreshes. Test with the `signin` scenario |
| 4 | **Sign-up code emails** | Each sign-up sends one email. A free sender allows only about 300 (Brevo) to 500 (Gmail) a day, and Supabase starts at about 30 an hour. **2,000 people cannot all sign up in the first morning** | **Open sign-up days before the fest** (about 300 a day over 7 days), long sessions so each person gets one email in the whole fest, password login afterwards (no email), a friendly "try again tomorrow" message, and browsing/clues that need no account. See `AUTH_EMAIL_OTP.md` section 3 |
| 5 | **Project paused / no backups on the free plan** | Free projects pause after a week of inactivity; there are no automatic backups | Use the project every few days; export on 24 Nov; nightly GitHub Action backup |
| 6 | **Realtime / websockets** | Connection limits on small plans | **Not used.** Polling only |
| 7 | **Cloudflare Worker free limits** | 100,000 requests a day, small CPU time | The only Worker is the push sender: a few hundred runs a day. Everything else is static files |
| 8 | **Thundering herd** | If every phone polls on the same second, load comes in waves | **Jitter** every poll interval by +/-30%, and every retry |
| 9 | **Cold caches** | The first requests after a deploy are slower | Warm the key pages 15 minutes before each peak; freeze deploys during the fest |

## 4. Rules the app must follow (these keep the peaks cheap)

1. **Everything public is a static file** served by Cloudflare Pages. 2,000 readers cost no server work.
2. **Two public calls only:** `rpc('app_status')` (tiny, polled) and `rpc('live_feed')` (fetched when the version changed). No other polling on public pages.
3. **One poll loop per device**, every `poll_seconds` (30 by default), **with +/-30% jitter**, paused when the tab is hidden, exponential back-off on errors (up to 120 s).
4. **No Realtime / websockets.**
5. **Writes are one function call** (`cast_vote`, `claim_stamp`), idempotent, with retry + jitter. A double tap or a retry can never count twice.
6. **Results:** `poll_results` every 10 s on the vote page only; the hunt leaderboard every 30 s on the hunt page only.
7. **Image budget:** thumbnails 240 px (about 15 KB WebP) in lists, 800 px covers on the event page only, unique file names, one-year cache. Mascots are inline SVG.
8. **Small JavaScript:** under 200 KB gzip on public pages; no analytics that slows the page; fonts preloaded.
9. **Push** runs in a Cloudflare Worker in batches of about 50 concurrent sends and continues from `push_queue`. At most 6 alerts per device per hour.
10. **Degrade, don't fail:** when something is slow, show the last data with "Updated 2 min ago".
11. **Registration windows:** events can have `registration_opens_at` and `registration_closes_at`; the Register button shows "Opens at 6:00 PM", "Register" or "Registration closed". Set by the **host**.

## 5. Per-peak plan

| Peak | What the system does | What you do |
| --- | --- | --- |
| P1 Gate rush | Static app, accounts created **in the days before**, password login (no email), Turnstile | Open sign-up now; raise Auth limits and the SMTP quota **before** 25 Nov; at the gate tell people "log in with your email and password"; anyone new still gets a code if the daily quota is left |
| P2 Registration | Event pages are static; Register button state from the host's window | Host opens the Google Form and sets the window together; avoid announcing two registrations in the same minute |
| P3 Competition on | Change alerts automatic; phones refresh at their next check; push in batches | Delay with one tap; expect a wave of refreshes within one poll |
| P4 Voting | Event page -> Vote button -> `cast_vote`; results every 10 s | Open voting 2 minutes after the performance ends; warm the pages before |
| P5 Hunt | Clues from `my_hunt`; one RPC per scan; no screens to keep running | Spread the 10 places |
| P6 Results | Leaderboard and archive | - |

## 6. Fest-week checklist (free; do on 23 Nov, undo on 28 Nov)
- [ ] Supabase: project used recently (not paused); Auth rate limits raised as far as the free plan allows; session lifetime about 4 h; custom SMTP sender working (limits known); sign-up opened early so the daily email quota is spread out; usage page bookmarked (egress, API requests, database size).
- [ ] Cloudflare: Pages project deployed from `main`, address final; `public/_headers` active; Turnstile widget created; the push Worker deployed with its cron and secrets; previous deployment known for rollback.
- [ ] `poll_seconds` at 30; know where the slider is.
- [ ] Cache warming script ready.
- [ ] Dashboards open on the owner's laptop: Supabase usage, Cloudflare analytics, email provider, uptime monitor on `/status`.
- [ ] Backup done on 24 Nov (CSV exports and `pg_dump`).
- [ ] After the fest: run archive and purge, rotate the service-role key and the VAPID pair.

## 7. Load tests (before the student test)
Scripts: `loadtest/k6-peaks.mjs` and `loadtest/create-test-users.mjs` (see `loadtest/README.md`). Against a Cloudflare **preview** deployment and a **staging** Supabase project (a second free project), never production:

| Scenario | Load | Pass |
| --- | --- | --- |
| `readers` | up to 2,000 virtual users for 10 min: `app_status` every ~30 s, `live_feed` when the version changes, `poll_results` every ~10 s on the vote page | p95 under 800 ms, errors under 1%; Supabase egress for the run stays tiny (extrapolate to the month) |
| `signin` | 2,000 sign-ins in 15 min, with 15 per second for 1 minute | no 429 for legitimate users, sign-in p95 under 2.5 s |
| `vote` | 1,200 votes in 60 s | 1,200 counted, none lost, write p95 under 1.5 s |
| `registration` | 400 requests per second on one event page for 30 s (static file) | p95 under 800 ms, all 200 |
| Push fan-out | one delay with 800-2,000 test subscriptions | all sent within 2 minutes, none duplicated |

If a scenario fails, fix the cause in section 3 (usually: raise `poll_seconds`) and rerun. Do not test with students until all pass.
