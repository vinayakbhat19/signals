# Free hosting: Cloudflare Pages + Supabase (no server)

Everything is free and nothing is bought. This file **replaces** every earlier mention of Vercel, ISR, API routes, Blob snapshots, Upstash and server middleware in the other documents. If a prompt or document still says "Vercel", "revalidate", "/api/live" or "service role" in the website code, follow this file instead.

## 1. The picture

```
Phone ──► Cloudflare Pages  (static files: pages, scripts, images; free, unlimited, spread worldwide)
  │
  └─────► Supabase          (database, login, voting, hunt; the phone calls it directly, protected by the database rules)

Two tiny Cloudflare Workers: (1) push alerts, (2) staff accounts (the admin creates hosts and volunteers with email + password). Nothing else runs on a server.
GitHub: the code, the build, and the emergency control panel.
```

There is **no server in between**. The website is a **static export** of Next.js: plain files. That is what makes 2,000 people at once free: Cloudflare serves static files without limit, and the only live traffic is small calls to Supabase.

## 2. Free limits that matter (check current numbers before relying on them)
| Service | Limit | Why we care |
| --- | --- | --- |
| Cloudflare Pages / Workers static assets | Static file requests free and unlimited | The whole website |
| Cloudflare Workers (free) | 100,000 requests a day; small CPU time; a Next.js server would not fit | Why we use **no** server code. The push Worker needs only a few hundred calls a day |
| Supabase free | 500 MB database, **5 GB egress a month**, 50,000 monthly users, project **pauses after a week without activity**, no backups | **Egress is the first limit we could hit.** See section 5 |
| Supabase Auth emails | Only a few hundred a day with a custom sender (Brevo about 300, Gmail about 500) | Every sign-up sends one code email: open sign-up early (`AUTH_EMAIL_OTP.md`) |
| GitHub free | Repository, Actions minutes | Code, nightly backup |

## 3. What this changes in the app (the rules for the coding agent)
1. **Next.js static export:** `output: 'export'` in `next.config`, `images: { unoptimized: true }`, `trailingSlash: true`. **No** API routes, route handlers, server actions, middleware, `cookies()`, `headers()`, ISR or `revalidate`. `npm run build` must produce an `out/` folder.
2. **One Supabase client, in the browser** (`@supabase/supabase-js`, session in localStorage). No `@supabase/ssr`, no cookies, no service-role key anywhere in the website. Security comes from the database (Row Level Security and the functions), not from hiding pages.
3. **No dynamic route folders** (`[id]`): a static site cannot create pages for events added later. Use query strings: `/event/?id=<uuid>`, `/vote/?id=<eventId>`, `/s/?t=<token>` (hunt stickers), `/venue/?id=`, `/lineup/?id=`, `/host/event/?id=`. Each is one static page that reads `id` from the address.
4. **Data comes from two public calls** (both work signed out):
   - `rpc('app_status')`: tiny (mode, banner, **version**, **poll_seconds**). Every phone calls it every `poll_seconds` (default 30), with ±30% random jitter, paused when the tab is hidden.
   - `rpc('live_feed')`: events, venues, latest changes, notices, open polls in one go (about 4 KB for 6 events, about 12 KB for all 21). Fetched **only when `version` changed** (and once at start). The version goes up whenever an organiser or host changes public data.
   Results: `poll_results` view every 10 s on the vote page only; hunt leaderboard every 30 s on the hunt page only.
5. **Offline and backup:** the last `live_feed` is kept in localStorage; the build also writes `public/live-fallback.json` (from `live_feed()` at build time). If Supabase is down the app shows the last data with "Backup mode, updates may be delayed". The service worker caches the app shell.
6. **Emergency control panel = GitHub:** `public/emergency.json` (`{ "banner": "...", "level": "critical", "events": [{ "id": "...", "status": "delayed", "starts_at": "..." }] }`). An organiser edits it on github.com from a phone; Cloudflare redeploys in about a minute; the app overlays it on whatever it has. Used only if Supabase is down. There is no PIN page.
7. **Rate limits live in the database** (cast_vote, claim_stamp, push subscribe) and in Supabase Auth settings (dashboard). No Upstash. No per-IP limits in the app (many students share one campus IP).
8. **Images:** no image optimizer. Covers are resized **in the browser on upload** into two files: a **thumbnail 240 px wide (about 15 KB WebP)** for lists and a **cover 800 px (about 80 KB WebP)** for the event page, uploaded with unique names and `Cache-Control: public, max-age=31536000, immutable`. The cover images you already have go into `public/covers/` in the repository so Cloudflare serves them for free.
9. **Security headers** go in `public/_headers` (Cloudflare reads this file): CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (`camera=(self)`), `frame-ancestors 'none'`; and cache rules: `/_next/static/*` immutable one year, HTML `max-age=0, must-revalidate`.
10. **Admin and host pages** are static pages that check the signed-in role by calling the database (`profiles.role`, `is_event_host`, `can_make_qr`); every write still goes through functions and policies that re-check on the server side of the database. A student who opens `/admin/` sees an empty "Not allowed" page and can do nothing.
11. **Sign-in is email + password with a 6-digit code** typed on the page (`verifyOtp`); there is no OAuth callback page. See `AUTH_EMAIL_OTP.md`.
12. **Staff accounts** need the **staff Worker** (`workers/staff/`, code and offline tests included): the admin page calls it with the admin's own login token; it creates the account with the service-role key, sets the role or host row, and refuses everyone who is not `admin`. The website gets its address as `NEXT_PUBLIC_STAFF_API`.
13. **Push alerts** are the other server code: a small **Cloudflare Worker** with a cron trigger every minute (see `PERMISSIONS_NOTIFICATIONS.md`). The browser subscribes with `rpc('save_push_subscription')`.

## 4. Step by step (free, no card)
1. **GitHub:** create a private repo; push the project.
2. **Cloudflare:** sign up (free) → Workers & Pages → Create → Pages → connect to Git → pick the repo. Build command `npm run build`, output directory `out`. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FEST_NAME`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_STAFF_API`. **Never add the service-role key here.** Choose the project name carefully: the address is `https://<name>.pages.dev` and goes into every QR.
3. **Supabase:** Authentication → URL Configuration: Site URL = the pages.dev address; add `https://<name>.pages.dev/**`. (Preview deployments get their own addresses: add them while testing, remove them before the fest.)
4. **Workers:** deploy `workers/staff` first (`workers/staff/README.md`), then the push Worker. `wrangler` (or the dashboard) → create `push-worker` with a cron trigger every minute; secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. The service-role key lives **only** here.
5. **Turnstile** (free): widget for the pages.dev address; site key in the website, secret in Supabase Auth → Attack Protection.
6. After every change that touches the address: reprint nothing as long as the project name stays the same.

## 5. Protecting the free limits
- **Egress (5 GB a month):** the version check keeps normal traffic tiny; `live_feed` is fetched only when something changed. Rough estimate (not measured): 500 people on the app on average for 8 hours a day over 3 days is about 3 GB including images. The safety panel has a **Polling slider** (`app_config.poll_seconds`, 10–300 s): if the usage graph in Supabase climbs faster than expected, raise it to 60 or 90 and every phone slows down within a minute, no redeploy.
- **Images** are the biggest risk: keep thumbnails at 15 KB, load only visible ones, and put the known covers in the repository.
- **Database size (500 MB):** votes, stamps and events are tiny. `rate_limits` and `push_queue` are cleaned up. Fine.
- **Pause after 1 week:** use the project every few days before the fest; open it on 23 Nov.
- **No backups on the free plan:** on 24 Nov export `events`, `venues`, `participants` (CSV from the admin pages) and run `pg_dump` once from the GitHub Action `nightly-backup.yml` or your laptop. Keep the files.
- **Watch** the Supabase usage page (egress, API requests, database size) during the fest. If egress passes 70% of the month, raise `poll_seconds` and remove the covers from the list view.
- **Supabase API capacity on the free compute is not published as a hard number.** The calls are tiny, but test them: run `loadtest/` against a staging project (`readers` scenario). If it can't take 2,000 people, raise `poll_seconds` first.

## 6. What stays the same
The database (all SQL files), the design, voting rules, the hunt, hosts and volunteers, the fest/campus mode switch, the archive and purge, and the alert wording. The only new SQL is in `schema_ops.sql` (live feed, version, poll interval, push subscribe, host voting) plus `bootstrap_admin.sql`.
