# Football live scores and reliability plan

> **Update:** football is **postponed** (not part of the first launch). Part A is kept for later. **Part B (reliability) applies to the fest and voting now**; read "football" endpoints in Part B as `/api/live` and `/api/vote/<eventId>`. Ignore the revised timeline at the end; use the build order in `PROMPTS.md`.

This adds to `PRD.md`. It covers the **two launch events**:
1. the **inter-college football tournament** (running now), and
2. the **campus fest on 25 Nov**.

Workshops, Signals-based connecting and everything else come after these two are stable.

---

## Part A: Football module

### What students see (`/football`, design: "Football: live match and table")
- **Live tab:** every live match with a big score, minute, half and goal/card timeline. "Updated N s ago" and "Live sync on/off."
- **Fixtures tab:** upcoming and finished matches by day; tap for match details.
- **Table tab:** points table per group (P, W, D, L, GD, PTS), top places highlighted, rule line: "Win 3 · Draw 1 · Loss 0." Only **finished** matches count.
- Home page shows a "Football live" card while any match is live.
- Every match has its own page and its own QR code (`/football/match/[id]`) for the touchline.

### What scorers do (`/admin/score/[matchId]`, design: "Scorer: live match control")
- Role **scorer**: can run matches, nothing else. Give it to 1–2 volunteers per ground.
- Big buttons: **+ GOAL (home)**, **+ GOAL (away)**, Yellow, Red, Note, Half time, Full time, Start 2nd half, **Undo last**.
- Optional player name, minute filled automatically from the match clock (editable).
- **Works on bad signal:** each tap gets an ID made on the phone (`client_ref`) and is queued in the phone's storage; it's sent when the connection is back. The database rejects a repeated ID, so retries never add a goal twice.
- The screen shows "Saved" or "3 taps waiting to send."

### Data (already written and tested: `supabase/schema_sports.sql`)
| Table | Purpose |
| --- | --- |
| `tournaments` | Name, sport, points for win/draw |
| `teams` | Name, short name, group, colour |
| `matches` | Teams, stage, ground, kick-off, status, half, clock, score (score is automatic) |
| `match_events` | Each goal, own goal, penalty, card, note: who, minute, who entered it |
| `standings` (view) | Points table calculated from finished group matches |

Rules enforced by the database (tested on Postgres 16):
- The score is recalculated from the goal log after every insert or undo, so it can never drift.
- Nobody, not even an organiser through the app, can type a score directly.
- A goal for a team that isn't in the match is rejected.
- The same tap sent twice is rejected.
- Students can read but not write; scorers can't create teams or fixtures; organisers can.

---

## Part B: Reliability: fast for everyone, and still working when something fails

### B1. How a student's phone gets data (reads)

```text
Phone ──► Vercel CDN (cached copy, 5–30 s) ──► Next.js function ──► Supabase (database)
  │              │                                   │ if Supabase fails or takes > 3 s
  │              │                                   └──► Backup copy (latest snapshot in Vercel Blob)
  │              │                                              │ if that fails too
  │              │                                              └──► Schedule bundled at deploy time
  │              └── if the function errors: CDN keeps serving the last good copy (stale-if-error)
  └── phone keeps the last good data in local storage and shows "Last updated 2 min ago"
```

| Layer | What it does | Setting |
| --- | --- | --- |
| Phone | Polls only while the screen is open; keeps last good data; shows an offline badge; backs off after errors | live match: every 10 s; other pages: every 30 s; paused when the tab is hidden |
| Service worker (PWA) | Caches the app shell, so the app opens even with no signal | cache-first for static files |
| CDN | One cached copy shared by everyone | live match `s-maxage=5`, others `s-maxage=15–30`, `stale-while-revalidate=300`, `stale-if-error=86400` |
| On-demand refresh | Every organiser or scorer save refreshes the cached copy immediately | `revalidateTag('live')`, `revalidateTag('match:<id>')` |
| Server | 3 s timeout on database calls, then the backup snapshot | `AbortController` |
| Backup snapshot | After every successful save, the server writes `live.json` and `football.json` to **Vercel Blob** (a different provider from Supabase) | written in the same server action |
| Last resort | Schedule built into the app at deploy time from the CSV | `public/schedule.json` |

**Why this answers "load balancer" and "database limits":** Vercel already spreads traffic across its global CDN and scales functions automatically. You don't run a load balancer yourself. Because of the cache, **the database is read about once every 5–30 seconds per page, whether 50 or 5,000 students are watching.** Database load stays flat as traffic grows.

### B2. Writes (organisers and scorers)
- **Server actions only;** the browser never writes fest data directly.
- **Rate limits** with Upstash Redis (`@upstash/ratelimit`, free tier). Writes are rare, so the free tier is plenty:
  - scorer taps: 60 per minute per user
  - organiser edits: 30 per minute per user
  - Signals: 5 per hour per user; "I'm interested": 30 per hour per user
  - emergency PIN attempts: 5 per 15 minutes per IP
- **Vercel Firewall:** a rate-limit rule on `/api/*` (writes only, a high flood guard such as 3,000 requests per minute per IP; never a low per-IP limit, because many students share one campus IP) and **Attack Challenge Mode** ready to switch on if someone floods the site.
- **Double-tap and retry safety:** `client_ref` on match events; the "+15 min" and "Mark done" buttons are disabled until the save finishes.

### B3. If the database is down: Emergency mode
- `/admin/emergency` works **without Supabase.**
- Login is an emergency PIN stored hashed in an environment variable, rate-limited, given only to the app owner and the head organiser.
- It can do 3 things, writing straight to the Vercel Blob snapshot:
  - post an announcement,
  - set a match score and status,
  - mark an event delayed or cancelled.
- Students' phones automatically show the snapshot (step B1), with a small banner "Running in backup mode."
- When Supabase is back, "Sync backup to database" shows the differences and applies them after confirmation.

### B4. Monitoring and alerts
- `/api/health` returns the status of the database, the snapshot and the build version.
- A free uptime monitor (UptimeRobot or Better Stack) checks `/api/health` every minute and alerts your phone.
- Vercel Analytics and logs; Supabase Reports (API requests and errors).
- Fest-day dashboard in `/admin/stats`: visitors, live matches, last save time, backup-mode flag.

### B5. Backups
- Snapshot JSON in Vercel Blob after every save (the live backup).
- **Nightly database export:** a GitHub Action runs `pg_dump` and stores the file as a private workflow artifact for 14 days. The database password is a GitHub secret.
- Supabase's free plan has **no automatic backups**; the Pro plan (about $25/month) adds daily backups. Optional.
- CSV export button for matches, events and the schedule in the admin panel.

### B6. Capacity check (load test before launch)
Run against the preview deployment, not production:
1. k6 or autocannon: **2,000 virtual users** polling the live match every 10 s for 10 minutes, plus page loads.
2. Pass criteria:
   - p95 response under 300 ms,
   - 0% errors,
   - Supabase API requests under 1 per second during the test.
3. Kill test: point the app at a wrong database URL. The site must keep showing the snapshot, and Emergency mode must work.

### B7. Costs and limits (check current pricing pages; plans change)
| Service | Plan | Why |
| --- | --- | --- |
| Vercel | **Pro, about $20 for the month of the events** | Hobby has a monthly cap on CDN requests and function usage, and a busy match can use hundreds of thousands of requests (1,500 phones × 6 requests a minute × 90 minutes ≈ 800,000). Going over a Hobby limit can pause the site. Pro also gives the firewall rate-limit rules. Downgrade after the fest |
| Supabase | Free (Pro optional for daily backups) | Database load stays small because of caching |
| Upstash Redis | Free | Rate limiting on writes only |
| Vercel Blob | Included with Vercel usage | Backup snapshots are a few KB |
| Uptime monitor | Free | 1-minute checks |

---

## Revised timeline (football first)

| Date | Work | Ready when |
| --- | --- | --- |
| 18–19 Nov | Phase 0 setup, Phase 1 foundation, **Track S (football)** | Scorers enter goals; students see live score and table |
| 20 Nov | **Track R (reliability)** + first deploy + load test | Kill test and load test pass; football used live |
| 21 Nov | Phase 2 public fest pages, Phase 3 organiser panel and CSV import | Fest schedule imported |
| 22 Nov | Phase 4 (My schedule, QR, PWA); Signals only if time allows | QR posters printed |
| 23 Nov | Phase 5 testing with students, security review, second load test | No open bugs |
| 24 Nov | Phase 6 go-live, posters up, organiser drill | |
| 25 Nov | Fest day | |

**For matches today, before the app is ready:** keep using your current method (announcer, WhatsApp). Don't run a half-built app during live matches. Switch once Track S passes its checks.
