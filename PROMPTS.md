# Phase-by-phase prompts for Antigravity

How to use:
1. Finish **Phase 0** in `LAUNCH_CHECKLIST.md` first (accounts, keys, database).
2. Open the project folder in Antigravity. Copy `PRD.md`, `PROJECT_RULES.md` and the `supabase/` and `templates/` folders into it.
3. In Antigravity, add `PROJECT_RULES.md` as a workspace rule (or keep the first line of every prompt, which tells the agent to read it).
4. Paste **one prompt at a time**. Review the plan the agent proposes before it starts. After each prompt, check the "You check" list yourself on your phone.
5. If something breaks, use the **Fix prompt** at the end. Don't paste the next phase until the current one works.

Replace `{{FEST_NAME}}`, `{{COLLEGE_NAME}}`, `{{COLLEGE_DOMAIN}}`, `{{BRAND_COLOR}}` before pasting.

---

## Phase 1: Foundation (19 Nov)

### Prompt 1.1: Project setup
```
Read PROJECT_RULES.md and PRD.md fully before doing anything.

Set up the project "fest-live" in this folder:
1. Create a Next.js app (latest stable, App Router, TypeScript, Tailwind, ESLint, src dir NO, import alias @/*). Initialise shadcn/ui and add: button, card, badge, input, textarea, select, tabs, dialog, sheet, sonner (toast), skeleton, switch, label, dropdown-menu.
2. Install: @supabase/supabase-js @supabase/ssr swr zod papaparse qrcode date-fns date-fns-tz lucide-react @vercel/analytics server-only, and dev types for papaparse and qrcode.
3. Create .env.local.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_FEST_NAME="Fiest 2026", NEXT_PUBLIC_COLLEGE_NAME="SDM College of Engineering & Technology, Dharwad". Make sure .env.local is in .gitignore. (I will fill .env.local myself.)
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
Read PROJECT_RULES.md. Build the app shell:
1. Root layout: fest name from env, metadata (title, description, Open Graph with a default image), theme colour #6D28D9, light/dark following the system, Vercel Analytics.
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
3. lib/auth.ts (server): getUser() and getProfile() (id, full_name, avatar_url, role, college_verified) using the cookie client; requireUser(next) redirects to /login; requireOrganiser() returns 404 for non-organisers.
4. Header avatar menu: name, "Verified student" badge if college_verified, My schedule, Sign out.
5. Show the "Organiser panel" link in More only for organiser/admin.
Test sign-in and sign-out on localhost. Then tell me exactly which redirect URLs must be in Supabase (localhost and Vercel). Run lint and build; report.
```
**You check:** sign in with your college Google account → "Verified student" badge. Then in Supabase → Table editor → profiles, set your `role` to `admin`.

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

### Prompt 4.1: My schedule
```
Read PROJECT_RULES.md and PRD F10.
1. Star button on EventCard and the event page: if signed out, go to /login?next=<current page>; if signed in, toggle a row in stars (cookie client, RLS) with optimistic UI and rollback on error.
2. /my (requireUser): starred events as a timeline in IST with now/next highlighting, a red "Clash" label on overlapping starred events, empty state linking to /schedule.
3. "Delete my account and data" at the bottom of /my: confirm dialog, then a server action that uses lib/supabase/admin.ts to delete the auth user (cascades to profile, stars, signals, responses), signs out and redirects home.
Run lint and build; report.
```

### Prompt 4.2: Signals
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
