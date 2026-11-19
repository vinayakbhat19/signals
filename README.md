# Fest Live: build kit

Everything needed to build **Fest Live** (the live fest guide plus the Signals "build together" board) with Antigravity, by 24 Nov 2026.

| File | What it is | When you use it |
| --- | --- | --- |
| `PRE_TEST_CHECKLIST.md` | **The gates before any student test** (sign-in, security, failure drills, load, alerts, hosts, mode switch) | Run with Prompt TEST.1 |
| `SECURITY.md` | Sign-in, roles, headers, uploads, secrets, privacy, 15 security checks | Read before Track SEC |
| `RESILIENCE.md` | Failure matrix (what if X fails), rate limits with fallbacks, degradation levels, load tests | Read before Track R.4 |
| `AUTH_EMAIL_OTP.md` | **Sign-in: email + password with a 6-digit code (no Google)**: flows, Supabase settings, and the email-quota plan |
| `brand/signals/` | The **Signals logo pack**: mark, stacked and horizontal logos (colour, white, black), app icons, favicons, brand sheet |
| `INSTALL_APP.md` | The "Add to Home Screen" button: what works on Android and iPhone, the manifest, the code |
| `SECURITY_CHECKLIST.md` | **The security checklist to pass before the student test**: 3 automatic tests (attack test, privilege audit, live smoke test) and the manual items |
| `security/` | `run_security_tests.sh`, `attack_test.sql` (102 attacks as signed-out, student, volunteer and host), `privilege_audit.sql`, `smoke_test.sh` (against the live site), `_headers.example` (site security headers) |
| `BREVO_SETUP.md` | Free Brevo email for the sign-up codes, and its Gmail-sender weak spot |
| `GOOGLE_SIGNIN_OPTIONAL.md` | Google sign-in as an extra button, with the exact Google Cloud branding values (app name Signals) |
| `legal/privacy.html`, `legal/terms.html` | Ready Privacy Policy and Terms of Service pages for Signals (hosted at /privacy and /terms; Prompt LEGAL.1) |
| `PERMISSIONS_NOTIFICATIONS.md` | Push alerts, camera | Read before Track N |
| `HOSTS_AND_AFTER_FEST.md` | Host management, and the automatic switch back to the Signals app on 28 Nov | Read before HOST.1 and END.1 |
| `BRAND.md` + `brand/` | **Official Fiesta'26 look:** logo, banner, app icons, colours, fonts | Copy `brand/` to `public/brand/`; attach with the first UI prompt |
| `FORMS_CHECK.md` | What the Linktree form previews show: confirmed times/venues and forms that look unfinished | Send to the committee |
| `APP_FLOW.md` | **The complete structure:** every screen (IDs 01–46), route, who sees it, where each button goes, flows, roles and the Next.js folder layout | Read first, alongside the designs |
| `design/` | `index.html` (all screens in flow order, clickable), `png/` (screenshot of every screen to attach to prompts), `screens/` (each screen as standalone HTML) | Attach PNGs to every prompt |
| `PRD.md` | Product requirements: goals, features, pages, data, limits | Read first; the agent reads it every phase |
| `PROJECT_RULES.md` | Rules for the coding agent: stack, caching, security, UI, how to report | Add as an Antigravity rule; copy into the project |
| `PROMPTS.md` | Copy-paste prompts, phase by phase, each with "You check" steps | 19–26 Nov, one prompt at a time |
| `LAUNCH_CHECKLIST.md` | Accounts, email-code sign-in setup, student test, go-live, fest-day runbook | Phase 0 (today) and 23–26 Nov |
| `supabase/schema.sql` | Database tables, triggers and security rules (tested on Postgres 16) | Run once in the Supabase SQL editor |
| `SPORTS_AND_RELIABILITY.md` | Part B: how the app stays fast and keeps working if the database fails (caching, rate limits, emergency mode, backups, load test, costs). Part A (football) is for later | Read Part B before Track R |
| `supabase/schema_sports.sql` | LATER: football tables, automatic score and points table, scorer role (tested on Postgres 16) | Not for the first launch |
| `VOTING.md` | Audience voting for selected competitions: organiser settings, voter rules, anti-cheat, screens | Before Track V |
| `supabase/schema_voting.sql` | Voting tables, cast_vote checks, private votes, results visibility, volunteer role (tested on Postgres 16) | Run after `schema.sql` |
| `STAMP_HUNT.md` | The bonus game: rules, anti-cheat, screens, volunteers | Only after everything else is tested |
| `supabase/schema_stamps.sql` | Treasure hunt: hidden places with clues, static QR codes, claim checks, 45 s gap, leaderboard (tested on Postgres 16) | Run after `schema.sql`, only if you build the hunt |
| `supabase/schema_participants.sql` | Event hosts, participants (private emails/phones), public line-up view (tested on Postgres 16) | Run after `storage.sql` |
| `templates/participants_template.csv` | Columns for hosts' registration sheets (CSV or Excel) | Send to event hosts |
| `supabase/schema_changes.sql` | Automatic change alerts: a trigger logs every time, venue or status change with a ready-made message (tested on Postgres 16) | Run right after `schema.sql` |
| `supabase/schema_ops.sql` | **Run last.** Fest/campus mode, kill switch, host voting controls, bootstrap of the main admin, audit log, database rate limiter, push storage, archive and purge (tested on Postgres 16) | After all other SQL files |
| `supabase/storage.sql` | Public buckets for event covers and contestant photos; only organisers can upload | Run after `schema.sql` |
| `supabase/seed_hunt.sql` | Stamp Hunt test data: opens the hunt for 12 h and creates a stamp point per seeded event (safe to re-run) | After `schema_stamps.sql` and `seed.sql`, development only |
| `supabase/seed.sql` | Sample venues, events, announcements and a live score | During building; deleted on 24 Nov |
| `templates/fiesta26_events.csv` | **The real Fiesta'26 competitions** (21) with their Google Form registration links. Fill in venue, start and end, then import | Send to the committee |
| `templates/schedule_template.csv` | Columns for the committee's schedule sheet | Send to the committee today |

## Order
1. Fill in the placeholders: `{{FEST_NAME}}`, `{{COLLEGE_NAME}}`, `{{BRAND_COLOR}}` (there is no college domain).
2. `LAUNCH_CHECKLIST.md` → Phase 0 (committee, GitHub, Supabase, email-code sign-in).
3. Read **PRD section 0**: the first launch is the **fest only** (schedule, announcements, results, audience voting; Stamp Hunt as a bonus). Football, Signals and stars come later.
4. `PROMPTS.md` → Phase 1 → Track R → Phases 2, 3 → **Track A (A.1–A.4)** → Track V → Prompt 4.3 → Phases 5, 6 → Track H (H.0–H.2). Attach the matching `design/png` screens to every prompt. Check each step on your phone before the next.

## New in this version: free Cloudflare hosting, 2,000 people, simple hunt and voting, host timing
| File | What it is |
| --- | --- |
| `PEAK_LOAD.md` | When the load comes (registration, voting, competitions), what breaks first, the rules, measured results, fest-week scaling checklist |
| `supabase/bootstrap_admin.sql` | Run once with your own email: you become the main admin |
| `workers/staff/` | The staff Worker (creates host/volunteer accounts with email + password, resets, removes; tested offline with `node workers/staff/test.mjs`) |
| `design/prototype/fiesta-intro.html` | **The first-screen intro animation**: the Fiesta'26 logo lands while the Signals letters are still arranging, the letters circle over it, then arrange under it as "BY Signals"; black turns purple (about 3.8 s, Prompt INTRO.1) |
| `SIGNALS_TEASER.md` | The animated "Signals: coming soon" page: animation order and timings, copy, developer card, and what still has to be built before launch. Open `design/prototype/signals-coming-soon.html` to see it move |
| `HOSTING_CLOUDFLARE.md` | **Read first for building.** Free hosting: static site on Cloudflare Pages + Supabase free plan + one tiny Worker for push. Limits, rules for the coding agent, step by step |
| `ADDRESS_AND_PEOPLE.md` | Free pages.dev address, sign-in without a domain, who can do what (hosts and volunteers by email) |
| `loadtest/` | k6 scripts for 2,000 readers, sign-ins, 1,200 votes in a minute, registration rush (run on staging only) |
| `supabase/tests/` | `run_tests.sh` runs the SQL tests for the treasure hunt, volunteers by email, who can make QR stickers, winners, open voting and host timing edits on a throw-away Postgres 16 |
Hosts now update their own event time, venue, status and registration window (`host_update_event`, screen 50); students see it on Home at once. Measured on the database alone: 2,000 distinct votes all counted once at about 5,100 per second; 2,000 stamps at about 4,400 per second; reads 1-4 ms. This does not prove the whole stack: run `loadtest/` on staging.

## What was tested in the schema
On a local Postgres 16 with stand-ins for Supabase's auth:
- profiles are created on sign-in (the optional email-domain flag is unused);
- visitors can read but not write fest data; only organisers can write it;
- users can't change their own role;
- Signal author names come from the profile, not the client;
- a 4th open Signal is refused;
- a Signal's contact is hidden: `select *` is refused, and the contact is returned only to the poster, accepted responders and organisers;
- responders can't accept themselves; posters can't respond to their own Signal or hide it;
- a Signal is hidden automatically after 3 reports.

The real Supabase project may differ slightly from that stand-in. If a statement fails when you run it, paste the error into Antigravity with the Fix prompt.

## What was tested in the sports schema
On a local Postgres 16, with the same stand-ins:
- the score is recalculated from the goal log (2–1), and undoing an own goal gives 1–1;
- a repeated tap (same client_ref) is rejected;
- a goal for a team not in the match is rejected;
- nobody can type a score directly;
- scorers can't create teams; students can't add events or change matches;
- the points table counts only finished group matches (win 3, draw 1).

## What was tested in the Stamp Hunt schema
On a local Postgres 16 that copies Supabase's default "grant everything" permissions:
- students can't read the hunt table (names, clues, codes) and can't insert stamps directly; clues come only through `my_hunt()` and place names appear only after a stamp;
- a stamp is worth 10; the same place twice, a wrong code, a second scan within 45 s and a closed hunt are refused; rotating a code kills the old sticker;
- the leaderboard shows "Asha K." style names, adds the complete-collection bonus (25 → 45), and hides people who opted out;
- nothing can be claimed after the hunt closes.

## What was tested in the voting schema
On a local Postgres 16 that copies Supabase's default permissions, installed in the launch order (`schema.sql` → `schema_voting.sql` → `schema_stamps.sql`, with `schema_sports.sql` added on top afterwards):
- students can't read the secret, insert votes directly, or get the venue code;
- one vote per person; same vote again is fine; changing too fast is refused; 3 changes, then locked;
- a contestant from another competition, a switched-off competition and a closed competition are refused;
- any signed-in account can vote with no code (the optional verified-only and venue-code switches stay off and are not shown in the app);
- live results show counts and percentages; "after close" results stay hidden until closing (organisers always see them); nobody sees other people's votes;
- volunteers and hosts can print hunt stickers; volunteers see the winners list; students can't.

## What was tested for accounts and covers
- Hosts and volunteers are created by the admin through the staff Worker (email + password); the admin role can only be set in the SQL Editor (`bootstrap_admin.sql`).
- Events have `cover_url`, `host_name` and `host_coordinator`, readable by everyone.
- `storage.sql` was not tested locally (it needs Supabase's storage schema).

## What was tested for hosts and participants
- Hosts see and edit only their own event's participants; students can't add participants or make themselves hosts.
- The same email can't be added twice to one event (case-insensitive), so re-uploads update instead of duplicating.
- The public line-up shows name, team, college, department, order and status only; hidden people and unpublished events don't appear; emails and phones are never exposed.

## What was tested for offline voting
- Volunteers can download the codes for the whole show; students can't.
- A vote made 10 minutes earlier with no network is counted when it syncs; a retry doesn't double count; a second vote is refused.
- Refused: an old code claimed as "now" (no backdating), a wrong code, a vote time in the future, a vote from before voting opened, and anything arriving more than 2 hours after closing.
- Results include offline votes; organisers can see offline votes per code window for fraud review.

## What was tested for change alerts
- Delaying an event logs "… now starts at 6:15 PM (was 6:00 PM)"; moving it logs "… moved to Main Stage (was Seminar Hall 1)"; changing both logs one combined message; cancelling and restoring log "… is cancelled" and "… is back on at …" (India time).
- Editing a description or marking an event done creates no alert.
- Everyone can read alerts; students can't add or delete them.

## What was tested for operations and safety (`schema_ops.sql`)
Installed in launch order on a local Postgres 16 with Supabase-style permissions:
- the mode is `fest` now and flips to `campus` at `campus_from` by itself; an organiser can force either; students can't change it;
- votes and stamps are accepted in fest mode, refused when writes are paused ("Writes are paused…") and refused in campus mode ("The fest is over");
- host invites: an unconfirmed sign-up with an invited email does **not** become a host; confirming the email does; a Google sign-up with a pending invite becomes a host; an existing confirmed user becomes a host at once; students can't invite; bad emails are rejected;
- a host sees their participants and loses access when `hosts_until` passes;
- the audit log records role changes, host changes and config changes; students see nothing;
- the database rate limiter allows N hits and then blocks, with a retry time; clients can't call it;
- delays and urgent announcements create push-queue rows; normal announcements don't; students can't read push tables;
- the archive/purge refuses in fest mode and for students, and in campus mode keeps vote totals, deletes votes, push subscriptions and participants' contact details.
Also tested: the admin email in `staff_invites` makes that sign-in the admin (others stay students, students can't promote themselves); a host turns voting on and off for THEIR event only (needs a team first, bad links, bad visibility and bad times refused, hosts see live counts even when results are hidden, other roles refused); the staff Worker's 7 offline tests (admin-only, origin check, weak passwords, duplicates, reset, remove, no password in the audit log).
Also tested for static hosting: `app_status()` carries a version and the polling interval; the version goes up on every event, venue, notice, change, poll or result change and the bump does not fill the audit log; `live_feed()` returns the public feed (about 4 KB for 6 events, no private columns) and works signed out; organisers can change `poll_seconds`, students can't; browser push subscribe (signed-in only, bad endpoints and keys refused, topics cleaned, 5 devices per person, remove works, tables unreadable by clients); `delete_my_account()` removes the user and refuses organisers.
Not tested here (needs real services or phones): email-code sign-in, MFA, the Cloudflare Worker, Web Push delivery, camera, headers. They are covered by `PRE_TEST_CHECKLIST.md`.
