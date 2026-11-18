# PRD: Fest Live (Version 0, Fest Edition)

| | |
| --- | --- |
| Product | **Fest Live**: the live guide to our campus fest, and the first version of a campus "build together" app |
| Owner | You (student founder) |
| Launch | Live by **24 Nov 2026, 9 pm**; used on fest day **25 Nov 2026** |
| Build window | 19–23 Nov (5 days), 24 Nov buffer |
| Platform | Mobile-first website (PWA) opened from a link or QR code. No app-store install |

Replace these placeholders everywhere before you start:

| Placeholder | Example |
| --- | --- |
| `{{FEST_NAME}}` | **Fiesta'26** (official name: Fiesta 2026) |
| `{{COLLEGE_NAME}}` | **SDM College of Engineering and Technology, Dharwad (SDMCET)**: confirm |
| Web address | **Free** `https://<project>.pages.dev` (no domain bought; the college gives none). See `ADDRESS_AND_PEOPLE.md` and `HOSTING_CLOUDFLARE.md` |
| `{{BRAND_COLOR}}` | #FFD60A (Fiesta yellow; full palette in BRAND.md) |

---

## 0. Scope for the first launch (updated: overrides the rest of this PRD)

The first launch is **Fiesta'26** (Fiesta 2026, intra college cultural fest, SDMCET Dharwad), **25–27 Nov 2026**.

| In | Later (after the fest) |
| --- | --- |
| Home (live now, up next, ticker), fest schedule, event pages, venues, announcements, results | **Football** live scores (`schema_sports.sql`, Track S) |
| **Audience voting** for selected **outdoor** competitions (`VOTING.md`); switched off for auditorium competitions (no network inside) | **Signals** (F11, F14) and **My schedule / stars** (F10) |
| **Sign-in and security:** Google, email + password, CAPTCHA, MFA for organisers, headers, audit log (`SECURITY.md`) | |
| **Phone alerts (push) and camera permission** with explanations (`PERMISSIONS_NOTIFICATIONS.md`) | |
| **Admin page** (yours alone), **host** and **volunteer** accounts created by the admin with email + password, hosts turn voting on/off, a **Signals: coming soon** teaser, black background like Signals; **Host management** (scope, expiry) and **after-fest mode switch** back to the Signals app on 28 Nov (`HOSTS_AND_AFTER_FEST.md`) | |
| **Change alerts:** every delay, time change, venue change or cancellation appears automatically at the top of Home and on an Updates page (`schema_changes.sql`) | |
| Organiser panel, CSV import, **event editor with cover photos and hosts**, **QR generator**, PWA with an **install bar** | Nearby, personal QR connect, communities, workshops |
| **Accounts:** Google or email + password (email confirmed, check-email and verified screens), cookie notice, My account page, **in-app QR scanner** (raised SCAN button in the bottom bar) | |
| **Hosts and line-ups:** event hosts upload registrations (CSV/Excel), check people in, export; students see the public line-up | |
| **Add to Home Screen** (PWA, never an app store) with a bar on every browser visit | |
| Reliability: caching, fallbacks, emergency mode, rate limits, monitoring (`SPORTS_AND_RELIABILITY.md` part B) | "Here Now" opt-in presence |
| **Treasure Hunt** (part of the launch): about 10 hidden places with static QR stickers; clues and hints; scan to collect; leaderboard (`STAMP_HUNT.md`) | |

Consequences:
- **Students never need to sign in to browse.** Accounts (Google, or email + password with a confirmation email) are only needed to vote and play the Treasure Hunt, and for organisers and volunteers. Anyone with an email or Google account can sign in and vote: there is no verification.
- "Schedule" is called **Events** in the app.
- The full screen list, routes, flows and app structure are in `APP_FLOW.md`; designs are in `design/`.
- No star buttons, no Signal buttons, no football pages. Bottom bar: **Home · Events · SCAN · Vote · Hunt** (account from the avatar) (show "Results" instead of "Hunt" if the hunt isn't built).
- The Signals, stars and sports tables can wait; nothing needs rewriting later.
- Success metrics for Signals and stars in section 3 don't apply. Add: votes cast, voters, and stage-screen uptime.

## 1. Problem

On fest day, students don't know what's happening, where, and when. The schedule is spread across posters, club Instagram stories and dozens of WhatsApp groups, and changes ("moved to 4 pm") reach only some people. Students who want teammates for competitions, or who want to meet people with similar interests, have no simple way to find each other.

## 2. Goals for fest day

1. Any student can see **what's happening now, what's next, and where**, within 3 seconds of scanning a QR code.
2. Organisers can **change the schedule and post announcements from their phone**, and students see it within 30 seconds.
3. Students can build **their own schedule** (star events).
4. Students can raise a **Signal** ("need a teammate," "open to connect") and respond to others. This tests the main product idea.

## 3. Success metrics (measured 25–26 Nov)

| Metric | Target |
| --- | --- |
| Unique visitors on fest day | ≥ 40% of students attending |
| Visitors who sign in | ≥ 20% of visitors |
| Signed-in users who star at least one event | ≥ 50% |
| Signals posted | ≥ 30 |
| Signals with at least one "I'm interested" | ≥ 50% |
| Users who open the site again on 26 Nov | ≥ 15% |
| Uptime during the fest | 100%; pages load in under 2.5 s on 4G |

## 4. Users

| User | Needs |
| --- | --- |
| **Student (visitor)** | See now/next, schedule, venues, results, announcements, without logging in |
| **Student (signed in)** | Star events → "My schedule"; post and answer Signals |
| **Admin** (the app owner; the Admin page is theirs alone) creates **hosts** and **volunteers** with an email and password; hosts run their own event (time, venue, voting on/off, participants); volunteers print hunt stickers and see winners |
| **Organiser** (optional committee head, same rights as admin for events) | Add/edit events, import the schedule, post announcements and results, hide bad Signals, print QR codes |
| **Admin** (you) | Everything an organiser can do, plus make people organisers |

## 5. Scope

### In scope (Version 0)

| # | Feature | Priority |
| --- | --- | --- |
| F1 | Home: **Happening now**, **Up next**, latest announcements, quick links | Must |
| F2 | **Schedule:** list by day and time; filter by category; search | Must |
| F3 | **Event page:** title, time, venue, category, description, status (on time / delayed / cancelled / done), registration link, contact, result | Must |
| F4 | **Venues:** list, each with its events and a Google Maps link (optional campus map image) | Must |
| F5 | **Announcements:** organisers post short updates; urgent ones show as a banner | Must |
| F6 | **Results:** winners and scores per event; "live" flag for ongoing matches | Must |
| F7 | **Organiser panel:** create, edit and delete events, venues, announcements and results from a phone | Must |
| F8 | **CSV import** of the schedule (from Google Sheets) | Must |
| F9 | **Google sign-in** (Supabase Auth); no verification badge: anyone signed in can vote and play | Must |
| F10 | **My schedule:** star/unstar events, personal timeline, clash warning | Should |
| F11 | **Signals board:** post a Signal (type, text, up to 3 tags, optional event, expiry); "I'm interested"; poster accepts; contacts revealed only after acceptance | Should |
| F12 | **QR codes:** one for the app, one per event and per venue; printable poster page | Must |
| F13 | **PWA:** installable, app icon, splash colour | Should |
| F14 | **Report a Signal;** organisers can hide it | Must (if F11 ships) |
| F15 | Basic analytics (page views, stars, Signals) | Should |

### Out of scope (later versions)

Native apps, push notifications, chat, nearby/location matching, personal QR connect, Builds/teams, communities, company spaces, poster-reading AI, payments or ticketing.

## 6. Feature details

### F1 Home (`/`)
- **Urgent announcement banner** (latest urgent announcement from the last 3 hours), dismissible.
- **Happening now:** events where `starts_at ≤ now < ends_at` and status isn't cancelled. Card: title, venue, ends-at time, category colour, "LIVE" dot.
- **Up next:** the next 5 events by `starts_at` (not cancelled).
- **Latest announcements:** 3 most recent, with "see all."
- **Refreshes every 20 seconds** without reloading the page.
- If nothing is on: "Nothing live right now. Next up: …"

### F2 Schedule (`/schedule`)
- Day tabs if the fest spans several days; default is today (Asia/Kolkata).
- Grouped by hour. Each row: time range, title, venue, category chip, status badge, ⭐ button.
- Category filter chips: Tech, Cultural, Sports, Workshop, Talk, Fun, Official.
- Search by title or venue (client-side).
- Cancelled events are shown crossed out; delayed ones with a "Delayed" badge.

### F3 Event page (`/event/?id=<uuid>`)
- All fields above, plus: "Add to Google Calendar" link, share button (Web Share API, falling back to copy link), ⭐ button, result block if present, "Raise a Signal for this event" button.
- Open Graph tags so WhatsApp shows a preview.

### F4 Venues (`/venues`, `/venue/?id=<uuid>`)
- List of venues; each page shows today's events at that venue in order, plus a Google Maps link if set.
- Optional: a static campus map image at `/public/campus-map.jpg`.

### F5 Announcements (`/announcements`)
- Up to 280 characters, optional link to an event, priority normal or urgent, time ago.
- Newest first.

### F6 Results (`/results`)
- Per event: title (e.g. "Winners") and body (plain text, line breaks kept). "LIVE" badge when `is_live`.

### F7 Organiser panel (`/admin`, organisers only)
- Tabs: Events, Venues, Announcements, Results, Signals (moderation), Import, QR.
- Mobile-friendly forms. Changing an event's time or status is at most 3 taps (quick "Delay 15 min," "Mark done," "Cancel").
- Every save immediately refreshes the public pages (on-demand revalidation).

### F8 CSV import (`/admin/import`)
- Upload a CSV with these columns (template in `templates/schedule_template.csv`):
  `code, title, description, category, venue, date (YYYY-MM-DD), start (HH:MM, 24 h), end (HH:MM), registration_url, contact_info`
- Times are Asia/Kolkata. Venues are created automatically by name.
- `code` is unique: re-importing updates existing events instead of duplicating them.
- Preview table with row-level errors before "Import." Nothing is saved if any row has an error.

### F9 Sign-in
- "Continue with Google." Browsing never needs sign-in; starring and Signals do.
- On first sign-in a profile is created. No verification is used.
- Roles: student (default), organiser, admin. Roles are set only in the Supabase dashboard (or by an admin), never by the user.

### F10 My schedule (`/my`)
- Starred events in time order, with now/next highlighting.
- **Clash warning** when two starred events overlap.

### F11 Signals (`/signals`, `/signals/new`)
- Types: **Need a teammate**, **Open to connect**, **Want to build**, **Open to work**.
- Text up to 200 characters; up to 3 tags (from a fixed list: AI, Web, App, Design, Robotics, Data, Startup, Music, Dance, Drama, Sports, Gaming, Photography, Open source, Other); optional linked event; expiry 6 h / 24 h / 3 days / 7 days.
- **Contact** (Instagram, LinkedIn, phone or email the user chooses), shared **only** with people the poster accepts.
- Board: newest first, filters by type and tag, only open and unexpired Signals.
- "I'm interested" lets the responder add an optional note and their own contact. The poster sees the responders with their notes and contacts, and accepts or declines. An accepted responder then sees the poster's contact.
- Limits: at most 3 open Signals per user; each user can respond once per Signal; nobody can respond to their own Signal.
- Report → organisers review; organisers can hide.
- The poster can mark it "Filled."

### F12 QR codes (`/admin/qr`)
- QR for the app home, for each event and for each venue, with the title printed under it. A4 printable page (2 or 4 per page) and PNG download.
- QR targets use the production URL plus `?src=qr-<type>-<id>` for analytics.

### F13 PWA
- `manifest.webmanifest` with name, short name, icons 192/512, theme colour `{{BRAND_COLOR}}`, `display: standalone`.
- "Add to home screen" hint on the second visit (dismissible).

### F15 Analytics
- Cloudflare Web Analytics (cookie-free) for page views and `src` query values.
- Database counts for stars, Signals and responses (admin page `/admin/stats`).

## 7. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Home first load under 2.5 s on a mid-range Android over 4G; JS under 200 KB gzip on public pages |
| Scale | 5,000 visitors on the day, 1,000 at once. The website is **static files on Cloudflare Pages** (free, unlimited); phones fetch the big data feed only when a version number changes, so the database load grows very slowly with visitors |
| Freshness | Organiser changes visible to students within 30 s |
| Time zone | Stored as `timestamptz`; always shown in **Asia/Kolkata** |
| Security | Row Level Security on every table; organiser actions checked on the server and in the database; Signal contacts protected (see schema) |
| Privacy | Collect only name, email and avatar from Google; no location; Signal contacts shared only after acceptance; delete-my-data button on `/my` |
| Accessibility | Colour contrast AA, tap targets ≥ 44 px, works with large text |
| Browsers | Chrome Android, Safari iOS 16+, Samsung Internet |
| Reliability | If the database is unreachable, public pages keep showing the last cached data |

## 8. Tech stack

| Layer | Choice |
| --- | --- |
| Frontend and server | Next.js (latest stable, App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Data and auth | Supabase (Postgres, Google OAuth, Row Level Security), `@supabase/supabase-js` in the browser |
| Hosting | Cloudflare Pages (free, static export of Next.js), a tiny Cloudflare Worker for push alerts, Supabase free plan, Cloudflare Web Analytics. See `HOSTING_CLOUDFLARE.md` |
| Libraries | `swr` (polling), `papaparse` (CSV), `qrcode` (QR), `zod` (validation), `date-fns` + `date-fns-tz` (time zone) |
| Source control | GitHub (new repository `fest-live`) |

## 9. Data model

Tables (full SQL with security in `supabase/schema.sql`):
- `app_settings`
- `profiles`
- `venues`
- `events`
- `announcements`
- `results`
- `stars`
- `signals`
- `signal_responses`
- `reports`

## 10. Pages

| Route | Who |
| --- | --- |
| `/` | Everyone |
| `/schedule` | Everyone |
| `/event/?id=` | Everyone |
| `/venues`, `/venue/?id=` | Everyone |
| `/announcements` | Everyone |
| `/results` | Everyone |
| `/signals` | Everyone can read; signed in to post or respond |
| `/signals/new`, `/signals/mine` | Signed in |
| `/my` | Signed in |
| `/login`, `/auth/callback` | Everyone |
| `/admin/*` | Organiser or admin |

## 11. Timeline

| Date | Phase |
| --- | --- |
| 19 Nov | Phase 0 accounts and setup; Phase 1 foundation, database, design system |
| 20 Nov | Phase 2 public pages |
| 21 Nov | Phase 3 sign-in, organiser panel, CSV import (**final schedule needed**) |
| 22 Nov | Phase 4 My schedule, Signals, QR, PWA |
| 23 Nov | Phase 5 testing with 20–30 students, security and load checks, fixes |
| 24 Nov | Phase 6 real data, production deploy, QR posters up, link shared |
| 25 Nov | Fest day: live operations (runbook in `LAUNCH_CHECKLIST.md`) |
| 26 Nov | Phase 7 metrics and feedback |

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Committee doesn't post updates on the day | Two trained organisers on duty in shifts; update drill on 24 Nov |
| Schedule arrives late | Build with seed data; CSV import makes loading the real schedule take minutes |
| Traffic spike | Edge caching; database is read only on revalidation |
| Google sign-in misconfigured | Set up on day 1; test on a real phone on 23 Nov |
| Spam or abusive Signals | Sign-in required, 3-open limit, reports, organiser hide |
| Venue Wi-Fi is weak | Small pages, cached data, no heavy images |
