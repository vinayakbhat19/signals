# What if it fails? Load, rate limits and fallbacks

This extends `SPORTS_AND_RELIABILITY.md` Part B (caching, snapshots, emergency mode). That file explains the read path; this one lists **every thing that can fail** and what happens.

## 1. Load balancing: what we use and what we don't

- **We don't run a load balancer.** Vercel puts every request through its global network and starts as many serverless instances as needed. That *is* the load balancer.
- **Reads** are cached at the edge (5–30 s) and refreshed instantly when an organiser saves. 5,000 students cost about the same database reads as 50.
- **Writes** (votes, stamps, sign-ups) are few per second and go straight to Postgres through Supabase's API. If you ever connect to Postgres directly, use the **pooled** connection string (Supavisor), never the direct one, so a burst of serverless instances can't exhaust connections.
- **Database size:** the free tier is plenty for this fest; the real limits are API requests per second and email sends per hour, both handled below.

## 2. Failure matrix

| What fails | What students see | Automatic fallback | What the organiser does |
| --- | --- | --- | --- |
| **Supabase database slow or down** | Schedule, line-ups, results from the last saved copy + banner "Running in backup mode"; votes and stamps show "try again soon" | CDN stale copy → Blob snapshot → bundled `schedule.json` → copy saved on the phone | Safety panel shows red; open **Emergency mode** to post announcements and mark delays; post in WhatsApp too |
| **Supabase Auth down** | Browsing works; sign-in shows "Sign-in is busy, try again" | Existing sessions keep working until their token expires | Wait; nothing to do. Votes/stamps need sign-in |
| **Google sign-in broken or blocked** | "Continue with Google" fails | **Email + password** is always offered beside it; in-app browser → "Open in Chrome" sheet | Check consent screen is "In production" and the redirect URL |
| **Confirmation emails not arriving** | "Check your email" with resend (1/min) | Google sign-in; organiser can confirm a user in the dashboard | Check SMTP provider status and limits; verify the sender address |
| **Vercel / site down** | Phones with the app installed open the cached shell and show the last data; browsers show an error | Service worker caches the shell | Redeploy previous version (**Instant Rollback**); send the PDF schedule on WhatsApp |
| **Bad deploy** | Errors after an update | — | **Instant Rollback** in Vercel (10 s). Freeze deploys after 9 pm on 24 Nov |
| **CDN serves stale data** | Delay up to 15–30 s | Organiser saves refresh it at once | Re-save the event |
| **Upstash Redis (rate limiter) down** | Nothing visible | Limiter switches to the **database** (`rate_hit`), then to **in-memory**; Safety panel shows "Backup in use" | Nothing; fix later |
| **Both limiters down** | Nothing visible | Reads and normal writes **fail open**; sign-up and password reset **fail closed** (short "try again later") | Restore Upstash/DB |
| **Blob snapshot store down** | Nothing visible | Snapshots skipped (logged); the database is still the source | Fix later; backup mode would have no snapshot, so watch the Safety panel |
| **Push service slow / device unreachable** | No phone alert | In-app alert on Home + `/updates` is the source of truth; alerts retried from `push_queue` | Use **Resend alerts**; announce on stage/WhatsApp |
| **Push permission blocked** | "Alerts are off" with how to turn on | Home alert + Updates page | — |
| **Camera blocked / no camera / old browser** | Steps to allow it; "Take a photo of the QR" | Open the sticker link from the phone's own camera app | Volunteer helps |
| **QR sticker damaged or missing** | Students can't scan that place | Volunteer reprints that one sticker (same link) | Check stickers each morning; keep spares |
| **A hunt QR leaks online** | Others can scan without finding the place | Organiser rotates that code and reprints one sticker | Watch the winners list for fast finishers |
| **Stage laptop/projector fails** | Voting QR missing | Open the stage screen on any volunteer phone | Spare laptop signed in as volunteer |
| **Phone offline** | Last data + "Offline" badge; stamps/votes can't be sent | App shell cached | — |
| **No mobile signal in the auditorium** | — | Voting is **off** for auditorium competitions (decision); schedule and line-up cached on phones that opened them before | Judges decide there |
| **Power cut** | — | Nothing depends on a powered screen (static stickers) | — |
| **Traffic spike / bot flood** | Slower pages at worst | Edge cache, rate limits, Vercel firewall; **Attack Challenge Mode** | Turn on Attack Challenge Mode; **pause writes** if needed |
| **Someone abuses votes/stamps** | — | One vote/stamp per person, rate limits, 45 s gap between stamps, fast-finisher check on the winners list | Fraud review; remove votes; pause writes |
| **Wrong data published** | Wrong time/venue | Every change is logged and alerts students automatically | Fix it; the correction alerts students too; **Undo** within 10 s |
| **Database full / quota hit** | Writes fail | Reads still served from cache | Pause writes; upgrade plan for the month |

## 3. Rate limits (and what happens when the limiter itself fails)

Fallback chain for every limit: **Upstash Redis → database `rate_hit()` → in-memory per instance.** Each call times out after 300 ms and moves to the next.

| Endpoint | Limit | Key | If all limiters fail |
| --- | --- | --- | --- |
| Sign-up | 5 per 10 min | **email** (plus a generous IP flood guard of 600 per 10 min) | closed |
| Login | 10 per 10 min | **email** (IP flood guard 600 per 10 min) | open |
| Password reset | 3 per hour | email (IP flood guard 300 per hour) | closed |
| Resend confirmation | 1 per 60 s | email | open |
| Push subscribe | 10 per hour | user or device id | open |
| Stamp claim | 10 per min (database: 6 per min) | user | open |
| Vote / change vote | 10 per min (database: 3 changes, 10 s apart) | user | open |
| Uploads | 20 per hour | user | open |
| Participants import | 10 per hour | host | open |
| Organiser/host writes | 60 per min | user | open |
| Any write `/api/*` | **3,000 per min per IP** flood guard only (Vercel Firewall). Never on reads | IP | n/a |

**Shared IP rule:** on campus Wi-Fi and mobile carriers hundreds of students share one public IP, so a low per-IP limit would lock out the whole campus. Real limits are per account, email or device. IP limits are only high flood guards. Sign-in, sign-up and reset calls run **from the browser** so Supabase sees each student's own IP. See `PEAK_LOAD.md` section 3.

A blocked request gets HTTP 429, a `Retry-After` header and a friendly message ("Too many tries. Try again in 40 seconds").

## 4. Degradation levels (what to do, in order)

| Level | Situation | Action |
| --- | --- | --- |
| 0 | Normal | — |
| 1 | **Backup mode:** database down or very slow | Automatic banner; reads from the snapshot; votes/stamps paused by errors |
| 2 | **Writes paused:** attack or data problem | Safety panel → Pause votes and stamps + banner message |
| 3 | **Emergency mode:** database down for more than 5 minutes | `/admin/emergency` (PIN): announcements, delays, cancellations go straight to the snapshot |
| 4 | **Manual:** site down | Rollback; PDF schedule and updates on WhatsApp; announcer on stage |

## 5. Monitoring

- `/api/health` returns `{ db, auth, snapshot_age_s, limiter, version }`; a free uptime monitor checks it every minute and alerts your phone.
- The Safety panel shows the same plus push queue size, device count and the latest audit entries.
- Watch on fest day: Vercel (errors, function time), Supabase (API requests per second, database CPU), Upstash (commands), email provider (sends).

## 6. Load test (before any student test)

Run `loadtest/k6-live.js` against the **preview** URL, never production:

| Scenario | Load | Pass |
| --- | --- | --- |
| Read | 2,000 virtual users load `/` once, then poll `/api/live` every 20 s and `/api/vote/<id>` every 5 s for 10 min | p95 < 300 ms, errors < 0.5% |
| Burst write | 500 test accounts each cast one vote within 60 s | all counted once, no 5xx |
| Auth burst | 200 sign-ins in 2 min | no 5xx; limiter returns 429 only past the limits |
| Kill test 1 | wrong Supabase URL in a local production build | pages still show the last data + banner |
| Kill test 2 | wrong Upstash URL | limiter source becomes "database" |
| Kill test 3 | wrong Supabase URL **and** wrong Upstash | limiter source "memory"; no crash |
| Kill test 4 | turn on `writes_paused` | votes/stamps show the paused message; browsing fine |
