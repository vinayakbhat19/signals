# Fest Live: build kit

Everything needed to build **Fest Live** (the live fest guide plus the Signals "build together" board) with Antigravity, by 24 Nov 2026.

| File | What it is | When you use it |
| --- | --- | --- |
| `BRAND.md` + `brand/` | **Official Fiesta'26 look:** logo, banner, app icons, colours, fonts | Copy `brand/` to `public/brand/`; attach with the first UI prompt |
| `FORMS_CHECK.md` | What the Linktree form previews show: confirmed times/venues and forms that look unfinished | Send to the committee |
| `APP_FLOW.md` | **The complete structure:** every screen (IDs 01–46), route, who sees it, where each button goes, flows, roles and the Next.js folder layout | Read first, alongside the designs |
| `design/` | `index.html` (all screens in flow order, clickable), `png/` (screenshot of every screen to attach to prompts), `screens/` (each screen as standalone HTML) | Attach PNGs to every prompt |
| `PRD.md` | Product requirements: goals, features, pages, data, limits | Read first; the agent reads it every phase |
| `PROJECT_RULES.md` | Rules for the coding agent: stack, caching, security, UI, how to report | Add as an Antigravity rule; copy into the project |
| `PROMPTS.md` | Copy-paste prompts, phase by phase, each with "You check" steps | 19–26 Nov, one prompt at a time |
| `LAUNCH_CHECKLIST.md` | Accounts, Google sign-in setup, student test, go-live, fest-day runbook | Phase 0 (today) and 23–26 Nov |
| `supabase/schema.sql` | Database tables, triggers and security rules (tested on Postgres 16) | Run once in the Supabase SQL editor |
| `SPORTS_AND_RELIABILITY.md` | Part B: how the app stays fast and keeps working if the database fails (caching, rate limits, emergency mode, backups, load test, costs). Part A (football) is for later | Read Part B before Track R |
| `supabase/schema_sports.sql` | LATER: football tables, automatic score and points table, scorer role (tested on Postgres 16) | Not for the first launch |
| `VOTING.md` | Audience voting for selected competitions: organiser settings, voter rules, anti-cheat, screens | Before Track V |
| `supabase/schema_voting.sql` | Voting tables, cast_vote checks, private votes, results visibility, volunteer role (tested on Postgres 16) | Run after `schema.sql` |
| `STAMP_HUNT.md` | The bonus game: rules, anti-cheat, screens, volunteers | Only after everything else is tested |
| `supabase/schema_stamps.sql` | Stamp Hunt tables, rotating codes, claim checks, leaderboard (tested on Postgres 16) | Run after `schema.sql`, only if you build the hunt |
| `supabase/schema_participants.sql` | Event hosts, participants (private emails/phones), public line-up view (tested on Postgres 16) | Run after `storage.sql` |
| `templates/participants_template.csv` | Columns for hosts' registration sheets (CSV or Excel) | Send to event hosts |
| `supabase/schema_changes.sql` | Automatic change alerts: a trigger logs every time, venue or status change with a ready-made message (tested on Postgres 16) | Run right after `schema.sql` |
| `supabase/storage.sql` | Public buckets for event covers and contestant photos; only organisers can upload | Run after `schema.sql` |
| `supabase/seed_hunt.sql` | Stamp Hunt test data: opens the hunt for 12 h and creates a stamp point per seeded event (safe to re-run) | After `schema_stamps.sql` and `seed.sql`, development only |
| `supabase/seed.sql` | Sample venues, events, announcements and a live score | During building; deleted on 24 Nov |
| `templates/fiesta26_events.csv` | **The real Fiesta'26 competitions** (21) with their Google Form registration links. Fill in venue, start and end, then import | Send to the committee |
| `templates/schedule_template.csv` | Columns for the committee's schedule sheet | Send to the committee today |

## Order
1. Fill in the placeholders: `{{FEST_NAME}}`, `{{COLLEGE_NAME}}`, `{{COLLEGE_DOMAIN}}`, `{{BRAND_COLOR}}`.
2. `LAUNCH_CHECKLIST.md` → Phase 0 (committee, GitHub, Supabase, Google sign-in).
3. Read **PRD section 0**: the first launch is the **fest only** (schedule, announcements, results, audience voting; Stamp Hunt as a bonus). Football, Signals and stars come later.
4. `PROMPTS.md` → Phase 1 → Track R → Phases 2, 3 → **Track A (A.1–A.4)** → Track V → Prompt 4.3 → Phases 5, 6 → Track H (H.0–H.2). Attach the matching `design/png` screens to every prompt. Check each step on your phone before the next.

## What was tested in the schema
On a local Postgres 16 with stand-ins for Supabase's auth:
- profiles are created on sign-in, with the verified-student flag from the email domain;
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
- students can't read the secret or printed codes, can't get a live code, and can't insert stamps directly;
- a live code during the bonus window gives 15 points; the same stamp twice, a wrong code and a stamp for a competition that isn't on are refused;
- the printed backup code gives 5 points;
- the leaderboard shows "Asha K." style names, adds the complete-collection bonus (25 → 45), and hides people who opted out;
- nothing can be claimed after the hunt closes.

## What was tested in the voting schema
On a local Postgres 16 that copies Supabase's default permissions, installed in the launch order (`schema.sql` → `schema_voting.sql` → `schema_stamps.sql`, with `schema_sports.sql` added on top afterwards):
- students can't read the secret, insert votes directly, or get the venue code;
- one vote per person; same vote again is fine; changing too fast is refused; 3 changes, then locked;
- a contestant from another competition, a switched-off competition and a closed competition are refused;
- Gmail accounts are refused when "college email only" is on; the venue code is required when that setting is on (and works in lower case);
- live results show counts and percentages; "after close" results stay hidden until closing (organisers always see them); nobody sees other people's votes;
- volunteers can run stage screens and Stamp Stations; students can't.

## What was tested for accounts and covers
- The Verified badge is granted only after the email is confirmed: a Google sign-in from the college domain is verified at once, an email/password sign-up only after clicking the link, a Gmail account never.
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
