# Phase-by-phase prompts for Antigravity

How to use:
1. Finish **Phase 0** in `LAUNCH_CHECKLIST.md` first (accounts, keys, database).
2. Open the project folder in Antigravity. Copy `PRD.md`, `PROJECT_RULES.md` and the `supabase/` and `templates/` folders into it.
3. In Antigravity, add `PROJECT_RULES.md` as a workspace rule (or keep the first line of every prompt, which tells the agent to read it).
4. Paste **one prompt at a time**. Review the plan the agent proposes before it starts. After each prompt, check the "You check" list yourself on your phone.
5. If something breaks, use the **Fix prompt** at the end. Don't paste the next phase until the current one works.

Replace `{{FEST_NAME}}`, `{{COLLEGE_NAME}}`, `{{BRAND_COLOR}}` before pasting. There is **no college email domain**: read `ADDRESS_AND_PEOPLE.md` (free vercel.app address, no student verification; hosts and volunteers are added by email). Read `PEAK_LOAD.md` too: the app must handle 2,000 people at once.

---

> **Build order (Fiesta'26 launch):**
> Phase 0 (**choose the free address name first**) → Phase 1 → **Track R** (R.1–R.4: reliability, rate limits, safety panel) → Phase 2 → Phase 3 → **Track A** (A.1–A.5) → **Track SEC** (SEC.1–SEC.2: sign-in and security) → **Track HOST** → **Track N** (permissions and notifications) → **Track V** (V.1–V.2) → **Track P** (P.1 peak load) → **Track STAFF** (STAFF.1) → **Track H** (H.0–H.2) → **Track END** (END.1: mode switch and fest-over) → Prompt 4.3 → **Track TEST** → Phase 5 → Phase 6. **Track END.2** (the Signals app for 28 Nov) after the fest starts, or earlier if time allows.
> **Skip** Prompts 4.1 and 4.2 here (they are END.2), **V.3** (offline voting) and **Track S** (football). Read PRD section 0 first, and paste this line at the top of every prompt: *"Scope: follow PRD section 0. Fest mode until 27 Nov, campus mode after. No football."*
> Database order: `schema.sql` → `schema_changes.sql` → `storage.sql` → `schema_participants.sql` → `schema_voting.sql` → `schema_stamps.sql` → **`schema_ops.sql` (last)**. `seed.sql` and `seed_hunt.sql` only during building.
> **Design:** read `APP_FLOW.md` and `BRAND.md` first. Attach the matching PNGs from `design/png/` to every prompt (IDs 01–60), and tell the agent: *"Match the attached screens exactly; the standalone HTML for each is in design/screens/."*
> **Security and failure rules apply to every prompt:** `SECURITY.md`, `RESILIENCE.md`.

## Phase 1: Foundation (19 Nov)

### Prompt 1.1: Project setup
```
Read PROJECT_RULES.md, PRD.md, PEAK_LOAD.md and ADDRESS_AND_PEOPLE.md fully before doing anything.

Set up the project "fest-live" in this folder:
1. Create a Next.js app (latest stable, App Router, TypeScript, Tailwind, ESLint, src dir NO, import alias @/*). Initialise shadcn/ui and add: button, card, badge, input, textarea, select, tabs, dialog, sheet, sonner (toast), skeleton, switch, label, dropdown-menu.
2. Install: @supabase/supabase-js @supabase/ssr swr zod papaparse qrcode date-fns date-fns-tz lucide-react @vercel/analytics server-only, and dev types for papaparse and qrcode.
3. Create .env.local.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_FEST_NAME="{{FEST_NAME}}", NEXT_PUBLIC_COLLEGE_NAME="{{COLLEGE_NAME}}". Make sure .env.local is in .gitignore. (I will fill .env.local myself.)
4. Create the Supabase clients exactly as PROJECT_RULES.md describes:
   - lib/supabase/public.ts: cookie-less anon client for cached public reads.
   - lib/supabase/server.ts: cookie-based client for signed-in server code, following the current Supabase SSR guide for the App Router.
   - lib/supabase/client.ts: browser client.
   - lib/supabase/admin.ts: service-role client, with import 'server-only'.
   - middleware.ts that refreshes the Supabase session (official @supabase/ssr pattern), skipping static files and images.
5. Generate TypeScript types for the tables in supabase/schema.sql into lib/types.ts (hand-written is fine; match the columns exactly; the signals type must NOT include contact).
6. lib/time.ts with Asia/Kolkata helpers: formatTime (e.g. "4:30 PM"), formatDay ("Wed, 25 Nov"), formatRange, isLive(event, now), isUpNext, minutesUntil, toIstDateKey (YYYY-MM-DD in IST), istToUtc(dateKey, "HH:MM"). Add unit tests for these with vitest (install vitest), including an event crossing midnight IST and a UTC server.
7. Do not run supabase/schema.sql; I have already run it.

Then show me the folder tree, run npm run lint, npm run build and npx vitest run, and report results.
```
**You check:** build passes; tests pass; `.env.local` not committed.

### Prompt 1.2: App shell and design system
```
Read PROJECT_RULES.md and BRAND.md. Copy the brand/ folder to public/brand/ and use brand/icon-192.png and icon-512.png for the web app manifest and favicon, brand/fiesta26-banner.jpg as the default Open Graph image and default event cover. Build the app shell:
1. Root layout: fest name from env, metadata (title, description, Open Graph with a default image), theme colour {{BRAND_COLOR}}, light/dark following the system, Vercel Analytics.
2. Mobile bottom tab bar (Home, Schedule, Signals, My, More) with lucide icons and the active tab highlighted; on screens ≥ 1024 px show a top nav instead. "More" opens a sheet with: Venues, Announcements, Results, About, and "Organiser panel" (only if the user is an organiser; for now just a link).
3. Shared components: CategoryChip (colours from PROJECT_RULES.md), StatusBadge (scheduled/delayed/cancelled/done), EventCard (time range, title, venue, category, status, live dot, star button placeholder), EmptyState, ErrorState with retry, PageHeader, and list skeletons.
4. A simple /about page explaining the app in 3 lines, with a contact for the fest committee.
5. A styleguide page at /dev/styleguide (only when NODE_ENV is development) showing every component in all states.

Check at 390 px, 768 px and 1280 px in the browser and in dark mode. Run lint and build. Report what you checked.
```
**You check:** open on your phone (use the Antigravity preview or `npm run dev -- -H 0.0.0.0` on the same Wi-Fi). It should look like an app.

### Prompt 1.3: Data layer and seed check
```
Read PROJECT_RULES.md. Create lib/data/ functions using the PUBLIC (cookie-less) client:
- venues.ts: listVenues(), getVenue(id)
- events.ts: listEvents() (published, ordered by starts_at, with venue name), getEvent(id) (with venue and results), listEventsByVenue(venueId)
- announcements.ts: listAnnouncements(limit)
- results.ts: listResults() (with event title)
- live.ts: getLiveData(now) returning { now: events live now, next: next 5 upcoming not cancelled, announcements: latest 3, urgent: latest urgent from the last 3 hours or null, serverTime }
All functions return typed data and throw a clear error on failure.
Write a quick script scripts/check-data.ts (run with npx tsx) that prints the results of each function, so I can confirm the database connection. Tell me to run supabase/seed.sql in the Supabase SQL editor first if no events come back.
Run the script and show the output.
```
**You check:** the script prints the seed events. If it errors, check `.env.local`.

---

## Phase 2: Public pages (20 Nov)

### Prompt 2.1: Live API and Home
```
Read PROJECT_RULES.md and PRD sections F1 and 7.
1. app/api/live/route.ts: GET returns getLiveData() as JSON, with export const revalidate = 15. Add Cache-Control so the CDN caches it (s-maxage=15, stale-while-revalidate=60).
2. Home page "/":
   - server-render the first data (revalidate 30) so it shows instantly,
   - then a client component polls /api/live with SWR every 20 s (fallbackData = server data),
   - sections: urgent banner (dismissible, remembered in localStorage by announcement id, wrapped in try/catch), "Happening now" (LIVE dot, "ends 5:30 PM"), "Up next" (with "in 25 min" countdown that updates every 30 s using serverTime offset, not the phone clock), latest 3 announcements with "See all", quick links to Schedule, Venues, Results, Signals,
   - empty state: "Nothing live right now. Next up: …".
3. Make sure Home works if /api/live fails (keep showing the last data and a small "Updating…" note).
Test by changing an event time in the Supabase table editor and confirming Home updates within about 30 s without reloading. Run lint and build; report.
```
**You check:** edit an event's time in Supabase and watch your phone update.

### Prompt 2.2: Schedule, event page, venues
```
Read PROJECT_RULES.md and PRD F2, F3, F4.
1. /schedule: day tabs (only days that have events; default today in IST, else the first day), events grouped by hour, category filter chips (multi-select, stored in the URL query so links can be shared), search box (client-side, title and venue), cancelled crossed out, delayed badge, "Jump to now" button. revalidate 30.
2. /events/[id]: full details; status; venue link; registration button; contact_info; result block; "Add to Google Calendar" (calendar.google.com/calendar/render?action=TEMPLATE with UTC dates); Share button (navigator.share, fallback copy link with a toast); star button placeholder; "Raise a Signal for this event" button linking to /signals/new?event=<id>. generateMetadata with Open Graph title/description. notFound() for unknown ids. Use generateStaticParams for existing events plus dynamicParams = true.
3. /venues and /venues/[id]: list with event counts; venue page shows today's and upcoming events in order and a Google Maps button if maps_url exists. If public/campus-map.jpg exists, show it on /venues.
4. /announcements (all, newest first, "time ago" in IST) and /results (grouped by event, LIVE badge, line breaks kept).
Check every page at 390 px with seed data, including empty states (temporarily filter to an empty category). Run lint and build; report.
```
**You check:** tap through every page on your phone; share an event link in WhatsApp and see the preview after deploy.

### Prompt 2.3: First deploy (do this today, not on the last day)
```
Prepare the project for Vercel:
1. Make sure the build has no warnings about dynamic usage on public pages (they must be static/ISR). List each route and whether it is static, ISR or dynamic from the build output.
2. Add a README section "Deploy" with the exact Vercel environment variables.
3. Commit everything with message "phase 2: public pages".
Then give me step-by-step instructions to push to GitHub and import into Vercel, and what to add in Supabase Auth URL configuration for the Vercel URL.
```
**You check:** the Vercel URL works on your phone over mobile data.

---

## Phase 3: Sign-in and organiser panel (21 Nov)

### Prompt 3.1: Google sign-in
```
Read PROJECT_RULES.md and PRD F9.
1. /login page with "Continue with Google" (supabase.auth.signInWithOAuth, provider google, redirectTo = NEXT_PUBLIC_SITE_URL + /auth/callback?next=<page>). Explain in one line why we ask (to save your schedule and post signals) and that browsing needs no login.
2. app/auth/callback/route.ts: exchange the code for a session and redirect to "next" (only allow relative paths starting with "/").
3. lib/auth.ts (server): getUser() and getProfile() (id, full_name, avatar_url, role) using the cookie client; requireUser(next) redirects to /login; requireOrganiser() returns 404 for non-organisers.
4. Header avatar menu: name, role label only if volunteer/host/organiser, Sign out.
5. Show the "Organiser panel" link in More only for organiser/admin.
Test sign-in and sign-out on localhost. Then tell me exactly which redirect URLs must be in Supabase (localhost and Vercel). Run lint and build; report.
```
**You check:** sign in with your Google account (there are no verification badges). Then in Supabase → Table editor → profiles, set your `role` to `admin`.

### Prompt 3.2: Organiser panel
```
Read PROJECT_RULES.md and PRD F5, F6, F7. Build /admin (requireOrganiser on every page and every server action):
1. Layout with tabs: Events, Venues, Announcements, Results, Signals, Import, QR, Stats.
2. Events: list (search, filter by day), create/edit form (title, category, venue select with "add new venue", date + start + end in IST, description, registration_url, contact_info, status, is_published), delete with confirm. QUICK ACTIONS on each row: "+15 min" (shifts start and end, sets status delayed), "Mark done", "Cancel", "Restore". Designed for a phone: big buttons, at most 3 taps.
3. Venues: create/edit/delete (name, description, maps_url).
4. Announcements: post (message up to 280 with counter, optional event, priority normal/urgent), list, delete.
5. Results: per event, title + body + is_live switch; create/edit/delete.
6. Every server action: validate with zod, check organiser again, write with the cookie client (RLS applies), then revalidatePath for "/", "/schedule", "/events/[id]" (the specific id), "/venues", "/announcements", "/results" and "/api/live" as relevant. Show a toast on success and the error message on failure.
Test: as organiser, delay an event by 15 min and confirm Home and Schedule show it within a few seconds. As a non-organiser account, confirm /admin gives 404 and that calling the server actions fails. Run lint and build; report.
```
**You check:** do the full "delay an event" flow on your phone, timing how many taps it takes.

### Prompt 3.3: CSV import
```
Read PROJECT_RULES.md and PRD F8. Build /admin/import:
1. Upload a CSV (papaparse, header row) with the columns in templates/schedule_template.csv. Also offer "Download template".
2. Validate every row with zod: required fields, category in the allowed list, date YYYY-MM-DD, start/end HH:MM 24 h, end after start (same day; if end < start treat as next day and show a warning), valid URL if present, duplicate codes inside the file.
3. Show a preview table: row number, parsed values, IST times, "new" or "update" (by code), and errors in red. The Import button is disabled while any row has an error.
4. Import in a server action: create missing venues by name (case-insensitive), upsert events by code, then revalidate all public paths. Report "X created, Y updated".
5. Test with templates/schedule_template.csv and with a broken copy (bad category, bad time, missing title) and show me both results.
Run lint and build; report.
```
**You check:** export the real schedule from Google Sheets as CSV and import it. Re-import it to confirm nothing duplicates.

---

## Phase 4: My schedule, Signals, QR, PWA (22 Nov)

### Prompt 4.1: My schedule (LATER: skip for the first launch)
```
Read PROJECT_RULES.md and PRD F10.
1. Star button on EventCard and the event page: if signed out, go to /login?next=<current page>; if signed in, toggle a row in stars (cookie client, RLS) with optimistic UI and rollback on error.
2. /my (requireUser): starred events as a timeline in IST with now/next highlighting, a red "Clash" label on overlapping starred events, empty state linking to /schedule.
3. "Delete my account and data" at the bottom of /my: confirm dialog, then a server action that uses lib/supabase/admin.ts to delete the auth user (cascades to profile, stars, signals, responses), signs out and redirects home.
Run lint and build; report.
```

### Prompt 4.2: Signals (LATER: skip for the first launch)
```
Read PROJECT_RULES.md (especially the Security section) and PRD F11 and F14. Build Signals:
1. /signals: board of open, unexpired signals (columns listed explicitly, never select *), newest first; filters for type and tag; each card: type icon and label, body, up to 3 tags, linked event title, author display_name with "Verified student" badge if verified, "time ago", expires in. Public read; revalidate 30.
2. /signals/new (requireUser): form with type, body (≤ 200, counter), up to 3 tags from the fixed list in the PRD, optional event (preselected from ?event=), expiry 6 h / 24 h / 3 days / 7 days, contact (≤ 100, with help text "Only shared with people you accept"). Insert with .select('id'). Show the database error "You can have at most 3 open signals" nicely.
3. "I'm interested" on a card (requireUser): dialog with optional note and the user's contact; insert into signal_responses; show "Sent" state; the button is hidden on your own signals and disabled if you already responded.
4. /signals/mine (requireUser): two tabs. "My signals": each with its responses (name, note, contact) and Accept / Decline buttons, plus "Mark filled" and "Delete". "My responses": each signal I responded to with status; when accepted, show the poster's contact from rpc('get_signal_contact').
5. Report button on each card (requireUser): optional reason; insert into reports; toast "Thanks, organisers will review."
6. Admin Signals tab: reported signals first with report counts and reasons; "Hide" (status hidden) and "Restore".
7. Test with two Google accounts (or one normal and one incognito window): post, respond, accept, check that the contact appears only after acceptance, report, hide. Also confirm in the browser network tab that the signals list response never includes "contact".
Run lint and build; report.
```
**You check:** do the two-account test yourself with a friend.

### Prompt 4.3: QR codes, PWA, stats
```
Read PROJECT_RULES.md and PRD F12, F13, F15.
1. /admin/qr: pick "App home", "All events" or "All venues"; generate QR codes (qrcode library, SVG) for NEXT_PUBLIC_SITE_URL + path + ?src=qr-<type>-<id>; printable A4 layout with 2 or 4 per page (title, time and venue under each code, fest name on top), print CSS hiding the nav; "Download PNG" per code.
2. PWA: app/manifest.ts (name, short_name, start_url "/", display standalone, theme and background colours, icons 192 and 512 generated from a simple fest logo placeholder I can replace at public/icon.png). Apple touch icon and apple-mobile-web-app meta. An "Add to home screen" hint on the second visit (localStorage counter in try/catch; dismissible; iOS shows the Share → Add to Home Screen instruction).
3. /admin/stats: total profiles, verified profiles, stars, signals (open/filled/hidden), responses (pending/accepted), top 10 most-starred events. Server-only queries with the cookie client (organiser RLS) or service role in a server-only file.
4. Check that ?src values appear in Vercel Analytics (explain where to look).
Run lint and build; report.
```
**You check:** print one QR page, scan it with your phone camera, and add the app to your home screen.

---

## Phase 5: Testing and hardening (23 Nov)

### Prompt 5.1: Security review
```
Act as a security reviewer for this app. Read PROJECT_RULES.md and supabase/schema.sql. Check and report (then fix anything you find):
1. Every /admin page and every server action re-checks organiser role on the server.
2. No code selects * from signals or exposes contact; check network responses of /signals and /api/live.
3. The service role key appears only in lib/supabase/admin.ts and is never sent to the browser (search the .next build output for it).
4. The auth callback only redirects to relative paths.
5. All forms are validated with zod on the server, including max lengths.
6. No dangerouslySetInnerHTML; user text is rendered as text.
7. As anon, try inserting into events and signals with the anon key using curl against Supabase REST; both must fail. Show the commands and responses.
List each check as pass/fail with evidence.
```

### Prompt 5.2: Performance and load
```
1. Run Lighthouse (mobile) on /, /schedule and an event page against the production build (npm run build && npm start). Report Performance, Accessibility, Best Practices, SEO, LCP and total JS. Fix anything that keeps Performance under 85 or LCP over 2.5 s.
2. Load test the deployed preview URL with autocannon: 200 connections for 30 s on "/" and on "/api/live". Report requests/s, p95 and p99 latency and errors. Then check in Supabase (Reports / API) that database requests stayed low, which proves caching works.
3. Simulate a database outage: set a wrong NEXT_PUBLIC_SUPABASE_URL in a local production build and confirm cached pages still render the last data and live polling shows "Updating…" instead of crashing. Restore the env afterwards.
Report numbers before and after fixes.
```

### Prompt 5.3: Fixes from student testing
After 20–30 students test it (see the checklist), paste their feedback:
```
Here is feedback from student testing on real phones: <paste notes>.
Group it into: bugs, confusing UI, missing must-haves for fest day, and nice-to-have. Fix all bugs and confusing UI now. For missing must-haves, propose the smallest change and do it if it takes under 1 hour. List nice-to-haves in BACKLOG.md and do not build them. Run lint and build; report.
```

---

## Phase 6: Go live (24 Nov)

### Prompt 6.1: Production checklist
```
Prepare for fest day:
1. Remove /dev pages from production builds and any test data code paths.
2. Give me the SQL to delete seed data (results, announcements, signals, events, venues) so I can import the real schedule.
3. Check every page against the production Vercel URL at 390 px, signed out and signed in, and list anything broken.
4. Create OPERATIONS.md for organisers with step-by-step, phone-friendly instructions: sign in, delay an event, cancel an event, post an urgent announcement, post a live score, hide a bad signal. Keep each task under 5 steps.
5. Commit "phase 6: fest ready" and tag it v0.1.0.
```

---

## Phase 7: After the fest (26 Nov)

### Prompt 7.1: Metrics report
```
Write scripts/fest-report.ts that prints, from the database: total users, verified users, users who starred at least one event, total stars, top 10 events by stars, signals by type, signals with at least one response, accepted responses, users active on 26 Nov (from stars/signals timestamps). Also give me the steps to read page views and ?src QR scans in Vercel Analytics. Then summarise the results against the success metrics in PRD section 3.
```

---

## Track S: Football live scores (LATER: not part of the first launch)

Before starting: run `supabase/schema_sports.sql` in the Supabase SQL editor (after `schema.sql`).

### Prompt S.1: Football data and public pages
```
Read PROJECT_RULES.md, SPORTS_AND_RELIABILITY.md (Part A and B1) and supabase/schema_sports.sql.
1. lib/data/football.ts (PUBLIC cookie-less client): listTournaments(), getTournament(id), listTeams(tournamentId), listMatches(tournamentId) with team names/colours and venue, getMatch(id) with events ordered newest first, getStandings(tournamentId) ordered by points desc, goal_diff desc, goals_for desc, name, grouped by group_name, getLiveFootball() returning { live matches with last 5 events, next 3 matches, serverTime }.
2. app/api/football/live/route.ts: GET returns getLiveFootball(); revalidate 5; Cache-Control "public, s-maxage=5, stale-while-revalidate=300, stale-if-error=86400"; tag the fetches with "football".
3. /football page with tabs Live / Fixtures / Table (tab in the URL query), matching the design screenshot I attach: big score, minute computed from clock_started_at + clock_offset_min using serverTime (not the phone clock), half label, goal/card timeline, "Updated N s ago", points table with P W D L GD PTS, top 2 highlighted, rule line.
4. /football/match/[id]: full match page with timeline; generateMetadata with the score in the title so WhatsApp previews show it.
5. Live data on the client: SWR polling of /api/football/live every 10 s ONLY while document.visibilityState is "visible", keep last good data in localStorage (try/catch), exponential backoff on errors up to 60 s, show an "Offline · last updated …" badge when a fetch fails.
6. Home page: show a "Football live" card when any match is live.
Seed: give me SQL to insert one tournament, 4 teams in group A and 2 matches so I can test.
Run lint and build; test with two browser windows (one scorer later, one viewer). Report.
```
**You check:** insert a goal row in Supabase's table editor and watch the score change on your phone within about 10 s.

### Prompt S.2: Scorer screen
```
Read PROJECT_RULES.md, SPORTS_AND_RELIABILITY.md (Part A "What scorers do", B2) and supabase/schema_sports.sql. Build /admin/score (list of today's matches) and /admin/score/[matchId], allowed for role scorer, organiser or admin (check on the server in every action):
1. Layout from the attached design: score, clock, big "+ GOAL" buttons per team (≥ 72 px tall), Yellow, Red, Note, optional player input, Half time / Start 2nd half / Full time, match log with "by <name>", "Undo last".
2. Every tap creates an event object with client_ref = crypto.randomUUID() and minute from the match clock, adds it to a queue in localStorage, and a sender posts queued items one by one to a server action. On success remove it from the queue; on network failure keep it and retry with backoff; on a unique-violation error for client_ref treat it as already saved. Show "Saved" or "N waiting to send".
3. Server actions: insertEvent (insert with client_ref; never send scores), undoLast (delete the newest event of that match), setStatus (status/period/clock fields only). After each success: revalidateTag("football") and revalidatePath for /football and the match page, then write the backup snapshot (Prompt R.2 adds this; leave a TODO hook now).
4. Optimistic UI: the score updates instantly on the scorer's screen from local events, then reconciles with the server.
5. Organiser-only /admin/football: create tournament, teams (name, short name, group, colour) and fixtures; CSV import for fixtures (columns: stage, group, home, away, date, time, venue).
Test: airplane mode on, tap +GOAL three times, airplane mode off, confirm exactly 3 goals arrive. Tap the same goal twice fast; confirm one goal. Undo; confirm the score drops. Run lint and build; report.
```
**You check:** run a 10-minute practice match with a friend scoring on one phone and you watching on another.

---

## Track R: Reliability (do right after Phase 1)

### Prompt R.1: Caching, timeouts and fallbacks for reads
```
Read SPORTS_AND_RELIABILITY.md part B1 carefully and implement it exactly:
1. lib/resilience.ts: withTimeout(promise, ms=3000); readWithFallback(primaryFn, snapshotKey) that tries Supabase with the timeout, then the Vercel Blob snapshot (live.json or votes-<eventId>.json), then public/schedule.json, and returns { data, source: "db" | "snapshot" | "bundled", fetchedAt }.
2. Use it in /api/live, /api/vote/[eventId] and the public pages' data functions. Add the "source" to the JSON; when source is not "db", the UI shows a small banner "Running in backup mode, updates may be delayed".
3. Cache headers on all public API routes: s-maxage as in the table, stale-while-revalidate=300, stale-if-error=86400.
4. Build step: a script that writes public/schedule.json from the database (or the CSV if the database is unreachable) during next build.
5. Service worker (next-pwa or a small custom sw.js): cache-first for static assets and the app shell, network-first with cache fallback for /api/live and /api/vote/*.
6. Client: last-good data in localStorage, offline badge, polling paused when the tab is hidden.
Then do the kill test: run a production build locally with a wrong NEXT_PUBLIC_SUPABASE_URL and show me that pages and APIs still return data from the snapshot or bundled file. Report.
```

### Prompt R.2: Snapshots, rate limits and Emergency mode
```
Read SPORTS_AND_RELIABILITY.md parts B2 and B3.
1. lib/snapshot.ts (server-only): writeSnapshots() builds live.json (now, next, announcements, urgent) and votes-<eventId>.json for each competition with voting on (results only if visibility allows) and uploads them to Vercel Blob (@vercel/blob put with addRandomSuffix false, allowOverwrite true, cacheControlMaxAge 5). Call it after every successful organiser write, and at most every 10 s after votes (debounced). Never let a snapshot failure fail the user's save; log it.
2. Rate limiting with @upstash/ratelimit + @upstash/redis (env UPSTASH_REDIS_REST_URL / TOKEN): limits from B2, keyed by user id (or IP when signed out). Return a friendly "Slow down, try again in N s" message.
3. Emergency mode: /admin/emergency with an EMERGENCY_PIN check (compare against EMERGENCY_PIN_HASH, a bcrypt or scrypt hash in env; rate-limited 5 per 15 min per IP; httpOnly cookie for 2 hours). It can post an announcement, mark an event delayed/cancelled, and switch voting off for a competition, writing ONLY to the Blob snapshots (no Supabase). Every emergency change is appended to emergency-log.json in Blob.
4. "Sync backup to database" (organiser, Supabase up): shows differences between the snapshot and the database and applies selected ones after confirmation. Votes are never written in emergency mode; voting simply pauses while the database is down.
5. /api/health: { db: ok|down, snapshot: age in seconds, version }, no caching.
Test: the kill test from R.1 plus posting an announcement through Emergency mode and seeing it on a phone. Report.
```

### Prompt R.3: Load test, monitoring and backups
```
1. Write loadtest/k6-live.js: 2,000 virtual users, each loads "/" once then polls /api/live every 20 s and /api/vote/<eventId> every 5 s for 10 minutes (ramp up over 2 minutes). Add a second scenario: 500 signed-in test users each casting one vote within 60 seconds (use test accounts and a test competition). Thresholds: p95 < 300 ms, errors < 0.5%. Give me the exact command to run it against the Vercel preview URL (k6 cloud is not needed; local k6 is fine).
2. During the test I will watch Supabase → Reports. Tell me what number proves caching works (API requests should stay under about 1 per second).
3. .github/workflows/nightly-backup.yml: nightly pg_dump using the SUPABASE_DB_URL secret, upload as a workflow artifact kept 14 days. Explain how to restore it.
4. Admin CSV export buttons for events, announcements, results and vote totals.
5. Write MONITORING.md: how to set up a free 1-minute uptime check on /api/health with phone alerts, what to watch on fest day, and how to switch on Vercel Attack Challenge Mode and add a firewall rate-limit rule for /api/*.
Report what you created and the commands.
```
**You check:** run the load test once on the preview, and do the kill test yourself before any live match.

### Prompt R.4: Rate limits with fallbacks, banners and the safety panel
```
Read RESILIENCE.md, SECURITY.md and supabase/schema_ops.sql (app_config, app_status, rate_hit). Match PNG 48 (safety panel).
1. lib/ratelimit.ts: limit(key, { limit, windowSeconds, failMode }) tries Upstash (@upstash/ratelimit sliding window); on error or after 300 ms falls back to rpc('rate_hit') with the service-role client; if that also fails uses an in-memory Map per instance; failMode 'open' (default) or 'closed' (sign-up, password reset). Returns { allowed, retryAfter, source } and never throws. Use the limits in RESILIENCE.md section 3 everywhere they are listed. A blocked request returns 429 with Retry-After and a friendly message.
2. lib/status.ts: getAppStatus() = rpc('app_status') cached 15 s (tag "status") with the last snapshot as fallback. The shell shows: the banner (info/warning/critical colours) at the very top; "Backup mode" when data comes from the snapshot; "Votes and stamps are paused" when writes_paused. Map Postgres errors with code P0001 (raised by the database) to their message text.
3. /admin/safety (organiser): health tiles (database ping with latency, auth ping, snapshot age, limiter in use: upstash | database | memory, push queue size and device count, email sender status), the pause switch (updates app_config.writes_paused), banner text and level, the mode radio Automatic / Force fest / Force campus, "Preview campus mode (only me)", the archive button (disabled outside campus mode), and the latest 10 audit_log rows. Every change calls revalidateTag('status').
4. /api/health returns { db, auth, snapshot_age_s, limiter, version } with no caching.
Test: break the Upstash URL (limiter source becomes "database"), then also the database URL ("memory"), hit login 11 times (429 with retry-after), turn writes_paused on and confirm votes show the paused message and the banner appears within 20 s. Report with evidence.
```

## Track A: Accounts, install, scanner, QR generator, event covers (after Phase 3)

Before starting: run `supabase/storage.sql`. In Supabase → Authentication → Providers → Email: enable email sign-in and **"Confirm email"**. Set up custom SMTP (see LAUNCH_CHECKLIST.md 0.4b): Supabase's built-in email sender is only for testing and sends very few emails per hour.

### Prompt A.1: Start flow and accounts
```
Scope: follow PRD section 0. Read PROJECT_RULES.md. Match the attached designs "1 Welcome", "2 Cookie notice", "3 Create account", "4 Log in", "My account".
1. /welcome: shown on the first visit only (localStorage flag in try/catch); buttons Create account, Log in, Just look around, and "Scan a QR" (opens /scan).
2. Cookie notice: a bottom sheet on the first visit. Only essential cookies (Supabase session) and an optional "Preferences" switch that controls whether we use localStorage for dismissed banners and last tab. Store the choice in localStorage; re-open it from My account. Vercel Analytics is cookie-free, so no analytics consent is needed; say so in the privacy page.
3. /signup: full name, email, password (min 8 chars with a number; strength meter; show/hide), terms checkbox, "Continue with Google". supabase.auth.signUp with options.data.full_name and emailRedirectTo NEXT_PUBLIC_SITE_URL/auth/callback?next=/account. After submit show "Check your email" with a resend button (rate-limited 1 per 60 s). Show NO college-email hint. The email field is just "Email". After submit say "Check your email".
4. /login: email + password, Google, "Keep me signed in" (default on), clear error messages, "Forgot password?" → /reset (resetPasswordForEmail) → /reset/new (updateUser password).
5. /account (requireUser): profile card (initials or photo, name, email, role (only for staff)), stats (stamps, hunt rank, votes cast; hide the hunt parts if the hunt isn't built), edit name/department (zod), change password, "Hide me from the leaderboard", Cookies and privacy, Install the app, Help, Sign out, Delete my account (service role, server-only).
6. The avatar on Home and the "More" tab open /account (or /welcome when signed out).
7. Validate every form with zod on the server; rate-limit signup, login and reset per email (5 per 10 min) with a high IP flood guard only.
Test: sign up with a Gmail address (plain student account, no badge), wrong password, password reset. Run lint and build; report.
```

### Prompt A.2: Install banner, scanner and QR generator
```
Read PROJECT_RULES.md. Match the attached designs "Home" (install bar), "5 Install the web app", "QR scanner" and "Organiser: QR generator".
1. Install bar: shown at the bottom (above the tab bar) on every visit while the site runs in a browser tab (not when window.matchMedia('(display-mode: standalone)') matches or navigator.standalone is true). "Install" uses the saved beforeinstallprompt event on Android/desktop Chrome; on iOS Safari it opens the sheet with the Share → Add to Home Screen steps. "×" hides it for the current session only.
2. /scan: camera QR scanner. Use the native BarcodeDetector when available, otherwise the "qr-scanner" npm package (ask before adding it). Rear camera, torch toggle if supported, a sweeping scan line, and a result sheet that recognises our own URLs: /s/... → "Collect stamp", /events/... → "Open event", /hunt → "Open the hunt"; any other URL shows the address and asks before opening. A clear message when camera permission is denied, with steps to allow it.
3. /admin/qr generator (replaces the simple QR page): type (App home, Event page, Venue, Hunt place (uses rpc list_stamp_qrs; same sticker as /admin/hunt/qr), Custom link). There is no separate vote QR: the Vote button is on the event page, pick the item, live preview card with title/time/venue and optional cover, mascot logo in the middle (use error-correction level H so the logo doesn't break scanning), size presets (sticker, A5 standee, A4 poster) with print CSS, PNG download, copy link, "All events" batch print, and a scan count per code from the ?src= parameter (count page views with that src in a small qr_scans table or from Vercel Analytics; your choice, write it in DECISIONS.md).
Test: install on an Android phone and an iPhone, scan printed codes of each type, and deny camera permission once to see the message. Run lint and build; report.
```

### Prompt A.3: Events list with covers and hosts, and the event editor
```
Read PROJECT_RULES.md. Match the attached designs "Events", "Event page (coming soon)" and "Organiser: event editor with cover photo". The events table now has cover_url, host_name and host_coordinator.
1. Rename Schedule to Events everywhere (route /events, tab label "Events"). List cards: cover thumbnail (82 px, next/image, blur placeholder; category-coloured illustration when there is no cover), status label (LIVE, COMING SOON · in N min/h, DONE · RESULTS, CANCELLED, DELAYED +N), title, time, venue, "Hosted by …", and VOTE/STAMP badges. Tabs All / Live / Soon / Done, search across title, venue and host.
2. Event page: full-width cover (16:9) with back/share over it, status chips, title, time and venue link, countdown when coming soon (from serverTime), host card (name, coordinator, Contact = contact_info), description, voting card (opens at / vote now), add to calendar, directions, stamp hint.
3. Organiser event editor: cover upload (accept images, resize client-side to max 1600 px WebP at quality 0.8 with a canvas, then upload to the event-covers bucket at <eventId>/<timestamp>.webp; save the public URL to cover_url; replace and remove; simple 16:9 crop), title, date/start/end (IST), venue, category, host, coordinator, description, registration link, switches for audience voting (creates/enables the poll), stamp station (creates/activates the stamp point if the hunt is built) and published; Preview and "Save and publish" (revalidate the public paths).
4. CSV import: add optional columns host_name and host_coordinator (update templates/schedule_template.csv). The real Fiesta'26 list is templates/fiesta26_events.csv (21 competitions with their Google Form links; venue, start and end must be filled in before importing).
5. Event page and Events list: a big Register button when registration_url is set. Use events.registration_opens_at / registration_closes_at (set by the HOST): before opening show a disabled "Opens at 6:00 PM" with a countdown (from serverTime), inside the window "Register" (opens the Google Form in a new tab), after closing or after the event starts "Registration closed". The page is static/ISR; compute the state in a small client component from serverTime so 2,000 people never cause extra server work.
Test: upload a large phone photo (it must end up under 400 KB), check the list and event page on a slow 3G throttle, and an event without a cover. Run lint and build; report.
```

### Prompt A.4: Navigation, verification screens, line-up and host participants
```
Read APP_FLOW.md (sections 1, 2, 5 and 7) and PROJECT_RULES.md. Match design PNGs 04, 05, 10, 13, 22, 23 and 42.
1. BottomNav component: Home · Events · SCAN (raised 62 px button in the middle, opens /scan) · Vote · Hunt, active state as designed, safe-area padding for phones with a home indicator. The avatar on Home opens /account.
2. AddToHomeBar above the nav (design 10): shown on every visit while not running standalone; "Add" opens /install (design 06) with iPhone steps and the Android prompt; "×" hides it for this session only.
3. Sign-up follow-up: /signup/check-email (design 04: email shown, resend countdown 60 s, change email) and /verified (design 05) as the redirect target of the confirmation link.
4. /hunt/leaderboard (design 23): podium for the top 3 with mascots, table from rank 4, my row highlighted, "N points to pass …" hint, Scan button. Link it from /hunt.
5. Line-up (design 13): /events/[id]/line-up from participants_public ordered by performance_order nulls last, name; "On stage now" card for status on_stage, "Next" tag for the next checked-in performer; refresh every 15 s while visible; linked from the event page ("See the line-up · N performers").
6. Host participants (design 42): /host/events/[id]/participants for event hosts and organisers (check is_event_host on the server). Upload CSV with papaparse and Excel with SheetJS (install the official SheetJS package from cdn.sheetjs.com as its docs describe, not the old npm "xlsx" release; ask me before adding it). Map columns case-insensitively (name, team, college, department, email, phone, order), and accept Google Forms export headers directly: "Full Name"/"Name of the participant" → name, "Email Address"/"Email" → email, "Phone Number"/"Contact Number"/"Mobile" → phone, "College Name"/"Institution" → college, "Branch"/"Department"/"USN" ignored unless mapped, "Team Name" → team; ignore "Timestamp". Show a mapping step where the host can fix any unmatched column before importing, validate with zod, show "N new · N updated · N errors" with row-level errors before importing. Import in a server action: for rows with an email, update the existing participant with the same lower(email) in that event, otherwise insert. Check-in / On stage / Performed / Withdrawn buttons, drag or number to reorder, "Show line-up to students" switch (show_public for all), + Add manually, Export CSV and Excel with all columns.
7. Organiser: on the event editor, "Hosts" field to add hosts by email (inserts event_hosts for an existing profile; shows "ask them to sign up first" otherwise).
Test: upload templates/participants_template.csv, then re-upload with one changed name (must update, not duplicate), upload an .xlsx copy, check a student account sees the line-up but no emails (check the network response), and a non-host gets 404 on the host page. Run lint and build; report.
```

### Prompt A.5: Change alerts on the first page
```
Read APP_FLOW.md section 3.6 and supabase/schema_changes.sql (event_changes is filled automatically by a trigger when a published event's start time, venue or status changes). Match design PNGs 10 (Home alert), 11 (Events tags) and 15 (Updates page).
1. Add to getLiveData()/api/live: `changes` = event_changes from the last 3 hours (newest first, with event title) and `urgent` = urgent announcements from the last 3 hours. Every organiser save already revalidates /api/live, so alerts appear within seconds.
2. Home: an "Important updates" alert at the very top, under the header: bell icon (rings, off under reduced motion), "IMPORTANT · N UPDATES", the newest message as the title, the old value as the second line, "+ N more" when there are more; tap opens /updates. Dismiss "×" hides it until a newer change arrives (store the newest seen id in localStorage, in try/catch). Urgent organiser notices show first, in red.
3. /updates (design 15): tabs All / Changes / Notices; change cards coloured by kind (time = yellow, venue = cyan, cancelled = red, restored = lime) with the new value in bold and the old value crossed out; tap opens the event. Notices list with pinned urgent ones on top.
4. Events list and event page: chips TIME CHANGED / MOVED / TIME + VENUE CHANGED / CANCELLED when the event has a change in the last 3 hours, with the old time/venue crossed out next to the new one.
5. Organiser panel: after "+15 min", "Cancel" or a venue/time edit, show a toast with the exact message students will see ("Students now see: …") and an "Undo" for 10 seconds (restores the old values, which logs a matching change).
Test: delay an event by 15 min, move another to a new venue, cancel and restore a third; each must appear on a phone's Home within about 15 s with the right wording, and description edits must not create alerts. Run lint and build; report.
```

## Track SEC: Sign-in and security (after Track A)

### Prompt SEC.1: Sign-in, sessions and roles
```
Read SECURITY.md sections 1–3, PERMISSIONS_NOTIFICATIONS.md ("Continue with Google") and PROJECT_RULES.md. Match PNGs 03, 04, 05, 07.
1. Google: signInWithOAuth provider google with queryParams { prompt: 'select_account' }, redirectTo NEXT_PUBLIC_SITE_URL/auth/callback?next=<relative path>; the callback exchanges the code on the server and only accepts same-origin relative paths in `next`. Friendly page for access_denied.
2. In-app browser detection (Instagram, Facebook "FBAN|FBAV", WhatsApp, Line, Snapchat, LinkedIn, Telegram): Google blocks sign-in there ("disallowed_useragent"). Show a sheet "Open in Chrome or Safari to continue with Google" with a Copy link button and the email + password form as the alternative.
3. Email sign-up and login as in A.1, plus Cloudflare Turnstile (or hCaptcha, whichever Supabase Auth is set to) on sign-up and reset; generic errors that never reveal whether an email exists; password min 8 with a number and a strength meter; resend confirmation 1 per 60 s.
4. Sessions: @supabase/ssr cookies (httpOnly, Secure, SameSite=Lax), refreshed in middleware; never put tokens in localStorage; "Sign out" and "Sign out on all devices" on My account.
5. Roles: lib/auth.ts requireRole('organiser' | 'host' | 'volunteer', eventId?) used in EVERY admin/host page and server action. It reads profiles.role / is_event_host() from the database, never from client data or JWT metadata. Unauthorised visits to /admin and /host return notFound().
6. Organisers and admins: /account/security to enrol TOTP MFA (QR code + 6-digit confirm); admin pages require the aal2 level once enrolled.
7. Rate limit with lib/ratelimit.ts (see R.4): sign-up 5/10 min per EMAIL, login 10/10 min per EMAIL (never low per-IP limits: hundreds of students share one campus IP; IP is only a flood guard of 600/10 min), call supabase.auth from the BROWSER, reset 3/hour/email, resend 1/min.
Test: Gmail sign-up (confirmation needed; no badge), 11 wrong passwords for one email, 11 wrong passwords (429), Instagram in-app browser (sheet appears), /admin as a student (404). Report with evidence.
```

### Prompt SEC.2: Hardening, uploads, secrets
```
Read SECURITY.md sections 4–9.
1. next.config headers on all routes: Content-Security-Policy (begin Report-Only with a per-request nonce, fix violations, then enforce), Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (camera=(self), microphone=(), geolocation=(), payment=()), frame-ancestors 'none'. poweredByHeader false, devIndicators false.
2. Every server action and route handler: check the Origin header, validate with zod, cap body size, never trust client-sent roles or ids, no service-role key outside lib/supabase/admin.ts (import 'server-only').
3. Uploads (event covers, contestant photos): jpeg/png/webp only, 5 MB max, verify magic bytes on the server, re-encode to strip metadata, random names.
4. CSV/Excel: parse in the browser, limit 5 MB and 5,000 rows, read formulas as values; on export prefix cells starting with = + - @ with a single quote; each export creates an audit entry (server action using the service role into audit_log).
5. Secrets: grep the repo and the .next client output for SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, UPSTASH_REDIS_REST_TOKEN, EMERGENCY_PIN_HASH, CRON_SECRET; add .env* to .gitignore; add a gitleaks pre-commit hook.
6. npm audit --omit=dev must show no high/critical; write DECISIONS.md with one line per dependency.
7. Logging: no emails, phone numbers or tokens in logs.
8. Run every check in SECURITY.md section 9 (the curl tests need NEXT_PUBLIC_SUPABASE_URL and the anon key) and paste each command and its output. Fix failures and rerun.
```

## Track HOST: Host management (after Track SEC)

### Prompt HOST.1: Invite, manage and expire hosts
```
Read HOSTS_AND_AFTER_FEST.md (Part 1) and supabase/schema_ops.sql (host_invites, invite_host, is_event_host, audit_log). Match PNGs 47 (manage hosts) and 42 (host participants).
1. /admin/hosts (organiser only): list every event with its hosts (event_hosts joined to profiles) and pending invites (host_invites); "Invite a host" form (event + email) calling rpc('invite_host'), showing status active or invited and the friendly error messages; remove a host (delete from event_hosts); cancel an invite (delete from host_invites); "No host yet" rows; show app_config.hosts_until ("Access ends …").
2. After an invite is stored, email the person (the app's SMTP/Resend) with a link to /login?next=/host and the line "Sign in with THIS email address". If the email fails show "Invite saved, but the email could not be sent: share this link".
3. /host: events I host with counts (registered, checked in) and links to /host/events/[id]/participants. Use requireRole('host', eventId); the database function is_event_host also enforces hosts_until.
4. Participants page as in Prompt A.4. Hosts CAN update their own event's time, venue, status, description, contact, form link and registration window: add /host/events/[id] (match PNG 50) calling rpc('host_update_event') with quick actions +15 min, +30 min, Cancel, Done, a "Students will see" preview and the alert count; map the errors (outside_fest, too_many, bad_url, bad_window) to friendly messages. Hosts cannot change the title, category or publishing. The alerts and the Home banner happen automatically from the database trigger. Every export creates an audit entry.
5. After hosts_until the host pages return 404; signed-in hosts see "Host access has ended".
Test: invite an email with no account (status invited); sign up with it WITHOUT confirming (no host access); confirm (host access appears); open another event's participants (404); set hosts_until in the past (404); remove the host (access ends at once). Report with evidence.
```

## Track N: Permissions and notifications (after Track HOST)

### Prompt N.1: Alerts (push) and camera permission
```
Read PERMISSIONS_NOTIFICATIONS.md and supabase/schema_ops.sql (push_subscriptions, push_queue). Match PNGs 08 (alerts + camera), 06 (add to home screen), 20 (scanner), 15 (updates).
1. Service worker: handle 'push' (title, body, icon /brand/icon-192.png, data.url, tag = event id so alerts for one event replace each other) and 'notificationclick' (focus or open data.url).
2. /account/permissions (design 08). NEVER request a permission on page load. "Turn on alerts": check Notification and PushManager support; on iPhone Safari outside the installed app show the Add to Home Screen steps; otherwise Notification.requestPermission(), pushManager.subscribe with NEXT_PUBLIC_VAPID_PUBLIC_KEY, POST /api/push/subscribe. "Not now" is remembered for 7 days. Show the real state (not asked / on / blocked) with a turn-off action and the blocked steps.
3. /api/push/subscribe and /api/push/unsubscribe: server routes using the service role (the tables have no client access): validate with zod (https endpoint ≤ 1000 chars, keys, topics from the allowlist changes, urgent, vote, hunt, event:<uuid>), upsert on endpoint, attach user_id when signed in, rate limit 10/hour/IP.
4. lib/push.ts with web-push (VAPID_PUBLIC/PRIVATE/SUBJECT from env): sendToTopic loads matching subscriptions in batches of 200, 5 s timeout, TTL 3600, urgency high for 'urgent'; delete subscriptions on 404/410, count failures otherwise and delete after 5; at most 6 alerts per device per hour.
5. Delivery: after every organiser save that creates event_changes or an urgent announcement, flush pending push_queue rows with Next after() (oldest first, set sent_at, attempts+1). Also /api/push/flush protected by an x-cron-secret header for Vercel Cron or manual use, and a "Resend alerts" button on /admin/safety.
6. Camera on /scan: ask only after the user taps "Open camera" (getUserMedia with facingMode environment); handle NotAllowedError (show the blocked steps from design 08), NotFoundError and insecure contexts; stop all tracks when leaving the page or when the tab is hidden; fallbacks "Take a photo of the QR" (input type=file accept=image/* capture=environment, decoded in the browser) and "Enter a code".
7. Add the entry points listed at the end of PERMISSIONS_NOTIFICATIONS.md (screens 05, 15, 14, 20).
Test: Android Chrome (browser and installed), iPhone (installed only), deny and re-allow notifications and camera, send a delay and see the alert within 10 s, delete a subscription in the browser and confirm it is removed after the next send, confirm the camera light turns off after leaving /scan. Report with evidence.
```

## Track V: Audience voting (after Phase 3)

Before starting: run `supabase/schema_voting.sql` (after `schema.sql`). Read `VOTING.md`.

### Prompt V.1: Voting for students and the stage screen
```
Scope: follow PRD section 0. Read PROJECT_RULES.md, VOTING.md and supabase/schema_voting.sql. Match the attached designs ("Vote", "Stage screen").
1. lib/data/voting.ts (PUBLIC cookie-less client for public parts): listOpenPolls() (enabled, with event title/venue/time and closes_at; select only the public columns of polls, never secret), getPollByEvent(eventId), getResults(pollId) from poll_results ordered by votes desc nulls last, sort, name. getMyVote(pollId) uses the cookie client.
2. app/api/vote/[eventId]/route.ts: GET returns { poll, contestants/results, serverTime }; revalidate 5; Cache-Control "public, s-maxage=5, stale-while-revalidate=60, stale-if-error=86400"; tag "votes:<eventId>".
3. /vote (hub): competitions currently voting, each with leader (if visible), total votes and closing countdown. Home shows a "Vote now" card while any poll is open. **The event page has the Vote button** (no QR to scan): the voting card shows "Voting opens at <time>" before and a big **Vote** button while open, linking to /vote/[eventId].
4. /vote/[eventId]: contestant cards (photo or initials, name, subtitle), "Vote" button, "Your vote" tag, live percentage bars when results are visible, otherwise "Results after voting closes" or "Results announced on stage". There is NO code box and NO verification (anyone signed in can vote). Signed out: the Vote button goes to /login?next=<this page> and brings the person straight back. Call rpc('cast_vote', { p_poll, p_contestant }) and show a friendly message for each reason (voted, same, changed with changes left, locked, closed, slow_down, sign_in). Optimistic UI for my own vote; results refresh via SWR every 5 s while visible.
5. /screen/vote/[eventId] (16:9 stage screen, no nav): huge animated bars (CSS transitions only), leader highlighted, total votes, and a QR that opens /events/[id] (a plain link) with the line "Open the app and tap Vote". No rotating code. Polls every 3 s; Screen Wake Lock.
6. Rate limit cast_vote calls with Upstash (10 per minute per user) on top of the database rules. After a successful vote, revalidateTag("votes:<eventId>") at most once every 5 s (debounce).
Test with three accounts on a test competition: vote, same vote, change, lock after 3 changes, results hidden until close when set, signed-out tap on Vote returns to the vote after login. Run lint and build; report.
```

### Prompt V.2: Organiser voting controls
```
Read VOTING.md. Build /admin/voting (organiser only, checked on the server):
1. List of competitions (events) with a big on/off switch each, status (Off / Open / Scheduled / Closed), total votes and leader (organisers always see counts).
2. Settings sheet per competition: title, opens/closes (IST date-time pickers or "when switched on/off"), Show results (Live / After close / Hidden). No verification or venue-code switches. Validate with zod; save; revalidateTag("votes:<eventId>").
3. Contestants editor: add/edit/reorder/deactivate, optional photo upload to Supabase Storage (public bucket "contestants", max 1 MB, resized client-side).
4. "Close voting now" (sets closes_at = now()), "Reopen", "Open stage screen" link, "Export results CSV" (contestant, votes, percent), and fraud review: list of votes changed 3 times or cast within the same second as many others, with "Remove vote".
5. Add "Voting" to the control room.
Test: switch voting on, vote from a phone, change visibility to Hidden and confirm students no longer see counts within 5 s, close voting and confirm votes are refused. Run lint and build; report.
```
**You check:** a full rehearsal with 10 friends voting for a test competition while the stage screen runs on a laptop connected to a projector or TV.

### Prompt V.3: Offline voting for the auditorium (LATER: skip for the first launch; voting is switched off for auditorium competitions)
```
Read VOTING.md ("Offline voting") and supabase/schema_voting.sql (get_vote_codes, cast_vote_offline). Match design PNGs 32 (vote saved offline) and 33 (stage screen offline).
1. Network detection: navigator.onLine is not reliable behind a signal blocker. Use a 4-second fetch of /api/health; if it fails, switch the vote page and stage screen to offline mode and show the "No network · offline voting is on" banner. Re-check every 15 s.
2. Make the vote page work offline: the service worker precaches the vote page shell, fonts, mascots and /api/vote/<eventId> (contestants) whenever a signed-in user opens it online. Home shows "Going to the auditorium? Open the vote now so it works inside" when a poll with an offline-friendly setup (results after close + must be at venue) starts within 2 hours.
3. Offline vote: the user picks a contestant and types the 6-character code; save { pollId, contestantId, code (upper case), cast_at = new Date().toISOString(), client_ref = crypto.randomUUID() } in IndexedDB (a small wrapper like idb-keyval; ask before adding). Show design 32. One saved vote per poll per device (replace only if the user explicitly changes it before it is sent).
4. Sending: on 'online', on app open, on visibilitychange and every 30 s while the app is open, send each queued vote with rpc('cast_vote_offline', …) after refreshing the Supabase session. On ok or reason 'same' remove it and show "Your vote for X was counted"; on a definitive refusal (code, outside, late, already, college_only, unknown) remove it and show the message; on network errors keep it and retry with backoff. Use Background Sync where supported (Android Chrome); iPhones send when the app is opened again (say so in the UI).
5. Stage screen offline mode (design 33): when opened online, call rpc('get_vote_codes', { p_poll, p_hours: 6 }), store the list in localStorage, compare Date.now() with serverTime and refuse to start if the laptop clock is off by more than 10 s ("Fix the laptop clock, then reload"). Offline, show the code for floor(Date.now()/30000) from the stored list with the countdown ring, the 3 steps, and "Results after the show". Show a warning when fewer than 30 minutes of codes remain.
6. Organiser voting control: an "Offline votes" panel per poll with counts by source, a chart of offline votes per code window (offline_vote_windows), and "Remove votes from window …" for suspicious spikes (confirm first).
Test with airplane mode: open the vote page online, switch to airplane mode, vote with the code shown on a laptop stage screen that was also switched offline, turn airplane mode off, and confirm the vote counts within 30 s (Android) or on reopening (iPhone). Also try: a wrong code, a code typed 5 minutes after it was shown, and sending the same queued vote twice. Run lint and build; report.
```
**You check:** a rehearsal inside the auditorium itself with 10 phones (Android and iPhone) and the real stage laptop.

## Track H: Treasure Hunt (part of the launch)

Before starting: run `supabase/schema_stamps.sql` (after `schema.sql`). Read `STAMP_HUNT.md`. The hunt has about 10 hidden places. Each place has a static QR sticker (made once by a volunteer or host); students read a clue and a hint, find the place and scan. There is no rotating code, no Stamp Station screen and no time window per competition.

### Prompt H.0: Replace the hunt placeholder (use this if /hunt shows "launches in Track H" or "Explore events")
```
The /hunt page is a placeholder. Remove it and build the real Treasure Hunt now. Read STAMP_HUNT.md, APP_FLOW.md (screens 20-23) and supabase/schema_stamps.sql. Match the attached PNGs 20 (scanner), 21 (stamp collected), 22 (hunt), 23 (leaderboard) exactly. First give me the SQL steps: run supabase/schema_stamps.sql if the stamp tables don't exist, then supabase/seed_hunt.sql for 10 sample places.
Then do Prompts H.1 and H.2 below. Never show "launches in Track H" or "Explore events".
```

### Prompt H.1: Hunt pages and claiming
```
Scope: follow PRD section 0. Read PROJECT_RULES.md, STAMP_HUNT.md and supabase/schema_stamps.sql. Match the attached designs ("Treasure hunt: clues", "Scan", "Stamp collected", "Leaderboard").
1. lib/data/hunt.ts: getHunt() (stamp_hunt), getPassport() = rpc('my_hunt') (works signed out too: clues only), getLeaderboard(limit) from stamp_leaderboard ordered by score desc, last_scan asc. NEVER read the stamp_points table from the client: it has no client access.
2. /hunt (design 22): points / rank / places found card; the clue list from my_hunt(): found places show their name, "+10" and the found_text; the first unfound clue is expanded with the clue text, the hint (always visible in a small box) and a "Scan it" button (opens /scan); later clues collapsed ("Clue 5 - tap to read"), or locked when `locked` is true (sequential mode); top hunters preview with my row; "Hide me from the leaderboard" switch (profiles.leaderboard_hidden); closing countdown. Signed out: clues visible, big "Join the hunt" sign-in button.
3. /s/[token] (the URL inside every sticker): token = "<point id>.<code>" (split on the first dot). Signed out: go to /login?next=<this URL> and come back. Signed in: call rpc('claim_stamp', { p_point, p_code }) ONCE (guard against React double-invoke). Show design 21: "+10!", the found place name, found_text, progress "x of 10", rank, and the NEXT clue with "Next clue". Friendly messages for already, too_fast (show the wait seconds as a countdown), bad_code, closed, slow_down. After success revalidateTag('hunt').
4. /scan must recognise our own links: /s/... -> "Collect stamp", /events/... -> "Open event", /hunt -> "Open the hunt"; anything else shows the address and asks before opening. No "enter a code" box.
5. /hunt/board: fullscreen leaderboard for a TV (big type, auto-refresh 15 s, top 15, QR to /hunt in the corner).
6. Rate limit /s claims per user (10 per minute) on top of the database rules; the database also keeps a 45 s gap between scans.
Test with seed_hunt.sql on two accounts: read clues signed out, claim with the right QR link, claim again (already), wrong code (bad_code), scan two places within 45 s (too_fast), and confirm the place names are not in the network response before they are found.
```

### Prompt H.2: Hunt stickers, winners and the organiser editor
```
Read STAMP_HUNT.md and ADDRESS_AND_PEOPLE.md. Build:
1. /admin/hunt/qr (volunteers, hosts and organisers; use rpc('can_make_qr') on the server): list from rpc('list_stamp_qrs') with each place number, name, clue and a Print button; "Print all 10 (PDF)". A sticker shows: a QR encoding NEXT_PUBLIC_SITE_URL + path (path from the function, e.g. /s/<id>.<code>), the Fiesta'26 logo, the line "Scan to collect your stamp" and the place NUMBER only. NEVER print the place name or the clue on the sticker. QR error-correction level H, black on white, at least 5 cm for an A6 sticker. One-time: nothing on this page refreshes or rotates.
2. /admin/hunt (organiser): hunt name, open/close time, points, min gap seconds, "one clue at a time" switch (sequential); places: add/edit (hidden name, clue, hint, found message, mascot, order), turn on or off, "Rotate code" button (rpc('rotate_stamp_code'), with a warning that the old sticker stops working and must be reprinted), per place the number of stamps; a list of stamps with "Delete" for suspicious ones.
3. /admin/hunt/winners (volunteers and organisers): rpc('hunt_winners', { p_limit: 20 }) with search, rank, name, email, places, score, minutes taken (highlight under 15 minutes in orange), and "Export winners CSV". 
4. Add "Hunt" (stickers, winners, editor) to the control room.
Test: a volunteer prints a sticker, scans it from a phone, the stamp appears on /hunt and the leaderboard within 15 s; a student gets 404 on the sticker page; an organiser rotates a code and the old sticker is refused.
```
**You check:** print one sticker on paper, scan it with a different phone in daylight, and walk the 10 clues once yourself.

## Track END: Back to the Signals app after the fest (before testing)

### Prompt END.1: Mode switch, fest-over page and archive
```
Read HOSTS_AND_AFTER_FEST.md (Part 2) and supabase/schema_ops.sql (app_config, current_mode, app_status, archive_and_purge_fest). Match PNGs 60 (fest over) and 48 (safety panel).
1. Mode drives the shell: getAppStatus().mode. Fest mode bottom bar: Home · Events · SCAN · Vote · Hunt. Campus mode: Home · Events · SCAN · Signals · Me. Keep both definitions and a route allowlist per mode in lib/modes.ts. In campus mode /vote, /hunt (except the archive), /screen/* and /admin/station redirect to /fest-archive; in fest mode /signals redirects to Home.
2. The mode refreshes within 20 s without a reload (SWR on /api/live, which now includes app_status). The first visit after the switch shows /fest-over (design 60) once (localStorage flag in try/catch), then Home is the campus Home.
3. /fest-archive: Stamp Hunt top 10 (stamp_leaderboard), audience favourites (poll_results_archive, falling back to poll_results), the competitions with their results, thank-you text. Read-only.
4. Votes and stamps are refused by the database after the switch (message "The fest is over"): show it nicely if a stale page tries.
5. Brand: campus mode uses the campus app name and logo (placeholder wordmark 'Signals' in config/brand.ts, to be replaced); the Fiesta logo stays only in the archive and fest-over page.
6. "Preview campus mode (only me)": a signed cookie, read by getAppStatus() for organisers only, with a visible "Preview" ribbon. A preview never changes the database.
7. Safety panel archive button: confirm by typing DELETE FEST DATA, call rpc('archive_and_purge_fest'), show the returned counts; disabled outside campus mode.
8. After the purge, ask for alert permission again the next time the user opens Account → Alerts and camera.
Test on a COPY of the database: set campus_from to 2 minutes ahead and watch a phone flip by itself within 20 s; try to vote and stamp (refused); run the purge (counts match, vote totals kept, emails gone); set campus_from back to 2026-11-28 00:00 IST. Report with evidence.
```

### Prompt END.2: The Signals app for 28 Nov (Level B)
```
Build the minimum campus (original) app that shows in campus mode: run Prompts 4.1 and 4.2 above (My schedule, Signals: board, Raise a Signal, "I'm interested", accept, report, organiser moderation) with these differences: they appear only in campus mode; use the existing tables from supabase/schema.sql (signals, signal_responses, reports, stars); restyle with the brand tokens in BRAND.md (or the campus brand when I send it); contacts stay hidden until the poster accepts (get_signal_contact); apply the same security rules (SECURITY.md) and rate limits (3 open Signals per user at most; 5 new Signals per hour). Match the existing PNGs 90, 91, 92.
```

## Track P: Peak load for 2,000 people (after Track V, before Track TEST)

### Prompt P.1: Make the peaks cheap
```
Read PEAK_LOAD.md fully and loadtest/README.md. Scope: follow PRD section 0.
1. Public pages (home shell, /events, /events/[id], line-up, results, archive) are static or ISR; organiser and host saves call revalidateTag/revalidatePath so changes show at once.
2. /api/live: ONE combined endpoint (now, next, changes, urgent notices, app status, open polls) with s-maxage 15 and stale-while-revalidate 60. The app makes no other polling calls.
3. lib/poll.ts: one poll loop per device every 20 s (10 s on live pages) with +/-30% jitter, paused when the tab is hidden, exponential backoff to 60 s on errors; retries also use jitter. No Supabase Realtime for students.
4. Vote results cached 5 s and the leaderboard 15 s (route handlers with Cache-Control); never computed per request.
5. All sign-up, sign-in, reset and resend calls run from the BROWSER client. Rate limits are per email/account; any IP limit is only a flood guard (600 per 10 min) because hundreds of students share one campus IP.
6. Images: covers resized on upload (1600 px WebP), list uses thumbnails through next/image with long cache. Public pages under 200 KB gzip of JavaScript.
7. /api/push/send: batches of about 50 concurrent sends, 5 s timeout each, maxDuration 60, continues from push_queue, max 6 alerts per device per hour.
8. scripts/warm-cache.mjs: opens /, /events, every event page, /api/live and /api/vote/<id> (run 15 min before each peak).
Test: run loadtest/k6-peaks.mjs scenarios readers, signin, vote, registration against the PREVIEW deployment with a STAGING Supabase project (never production). Paste the results and fix anything over the thresholds.
```

## Track STAFF: Volunteers and hosts by email (after Track HOST)

### Prompt STAFF.1: Invite volunteers and hosts by email
```
Read ADDRESS_AND_PEOPLE.md Part 2 and supabase/schema_ops.sql (invite_host, invite_volunteer, staff_invites, accept_staff_invites). Match PNG 47.
1. /admin/hosts gets a role switch "Host (one event)" / "Volunteer (all)". Host: pick the event and an email, call rpc('invite_host'). Volunteer: email only, call rpc('invite_volunteer'). Show status active or invited and friendly errors. A list of current volunteers (profiles.role = 'volunteer') and pending staff_invites with a remove action (remove = delete the invite; set role back to 'student' with a server action that writes the audit log).
2. Tell the person to "Sign in with THIS email (Continue with Google is easiest)". Without a custom domain, show the invite link to copy and send on WhatsApp instead of emailing it.
3. Everywhere the app shows a badge or the text "verified", "ID checked" or "college email": remove it. There is no verification; anyone signed in can vote and play.
Test: invite an email with no account (invited), sign up with it WITHOUT confirming (still a student), confirm (volunteer appears); a student gets "Not allowed" from invite_volunteer and 404 on /admin/hunt/qr; a volunteer reaches the sticker page and the winners list but not the safety panel.
```

## Track TEST: Run the gates before we test

### Prompt TEST.1: Run PRE_TEST_CHECKLIST.md
```
Run PRE_TEST_CHECKLIST.md from top to bottom against the preview deployment. For every item you can check yourself (curl tests, lint, build, unit tests, k6 load tests, kill tests, schema tests): run it, paste the command and its output as evidence, and mark PASS or FAIL. Mark NEEDS A PERSON for anything that needs a phone or the committee. Fix every FAIL that is a code problem and run that check again. End with a table of results and the list of items I must check by hand.
```

## Utility prompts (use any time)

**Fix prompt**
```
Bug: <what you did> → <what happened> → <what you expected>. Device/browser: <e.g. Android Chrome>. Screenshot/error: <paste>.
Find the root cause before changing code, explain it in 2 lines, fix it with the smallest change, add a test if it is logic, run lint and build, and confirm the fix in the browser at 390 px.
```

**Review prompt**
```
Review the changes since the last commit against PROJECT_RULES.md and PRD.md. List problems by severity (security, broken on fest day, wrong behaviour, code quality). Do not change code; just report.
```

**Explain prompt (for learning and interviews)**
```
Explain how <feature, e.g. live updates / signals contact privacy / caching> works in this codebase: the files involved, the data flow step by step, and why it was designed this way. Keep it to one page.
```
