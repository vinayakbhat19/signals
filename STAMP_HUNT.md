# Fest Stamp Hunt

A game for fest day: visit competitions, scan the stamp QR at each one, climb the leaderboard, win prizes. It gets people to the competitions and gives everyone a reason to use the app.

**Priority:** part of the launch. Test data: `supabase/seed_hunt.sql`. If your build shows a placeholder, use Prompt H.0.

## Rules for players (put these on the Hunt page and the posters)
1. Sign in with Google to join (the rest of the app needs no sign-in).
2. At each competition, scan the **Stamp Station** QR on the volunteer's screen. Stamps work only while that competition is on.
3. **+10** per stamp. **+5 bonus** if you scan during a final or result moment. **+20** for collecting every stamp.
4. One stamp per competition per person.
5. The hunt closes at **[TIME]**. Top 3 win **[PRIZES]**. Everyone with all stamps enters the **lucky draw**.
6. To claim a prize: a college email account and your college ID at the help desk.
7. Organisers can remove stamps that look like cheating. Their decision is final.

## How cheating is prevented
| Trick | Why it fails |
| --- | --- |
| Photo of the QR shared on WhatsApp | The code changes every 30 s and is accepted for at most about a minute |
| Scanning before or after a competition | The database accepts stamps only from 10 min before to 15 min after that competition |
| Scanning the same stamp twice | One stamp per point per person (database key) |
| Scripts or spam | Max 6 claims a minute per person; rate limits on the server |
| Typing stamps in directly | Students can't insert stamps; only `claim_stamp()` can, after all checks |
| Many fake accounts | Prizes need a college email and ID at the desk |
| Volunteer's phone dies | Printed backup QR: works only during that competition, worth 5 points instead of 10 |

## Screens (see the design canvas)
- **Hunt** (`/hunt`): your passport (mascot stamps collected and missing, points, rank), the live leaderboard (top 10 + you), rules, closing time.
- **Scan result** (`/stamp/[pointId]?c=…`): what opens when you scan. Mascot celebration, "+15!", progress, rank. Friendly messages for "already collected," "code expired, scan again" and "not on right now."
- **Stamp Station** (`/admin/station/[pointId]`, scorer/organiser): fullscreen rotating QR with a countdown ring, competition name, scans so far, "keep the screen on" reminder.
- **Organiser:** create stamp points (name, competition, mascot, bonus window), print backup QR standees, view and remove stamps, export winners CSV, set open/close time.
- **Help desk screen** (`/hunt/board`): big leaderboard for a TV or projector, auto-refresh.

## Data (written and tested: `supabase/schema_stamps.sql`)
| Object | Purpose |
| --- | --- |
| `stamp_hunt` | One row: name, open/close time, point values |
| `stamp_points` | One per competition venue: name, linked event, mascot, bonus window, **secret** and **printed code** (hidden from students) |
| `stamps` | Who collected which point, when, points, live or printed |
| `claim_stamp(point, code)` | The only way to add a stamp; runs every check above and returns a friendly result |
| `get_live_code(point)` | For the Stamp Station screen (scorers and organisers only) |
| `get_print_code(point)` | For printing backup standees (organisers only) |
| `stamp_leaderboard` | First name + initial, verified badge, stamps, score; hides people who opted out |

Tested on Postgres 16 with Supabase-style default permissions: students can't read secrets or printed codes, can't get live codes, can't insert stamps; claim, duplicate, wrong code, not-live, printed backup, bonus window, complete bonus, opt-out and hunt-closed all behave as above.

## Load
Scans happen at most a few per second across the whole fest, so they go straight to the database (no caching needed). The leaderboard is cached like the other public pages (`s-maxage=15`) and refreshed when stamps are claimed (`revalidateTag('hunt')`, at most every 15 s).

## Volunteers
- 1 volunteer phone per stamp station, plugged into a power bank, screen-lock off, brightness up.
- The volunteer signs in with an account that has the **scorer** role.
- Printed backup standee (with the printed code) at each station, kept face-down unless the phone fails.
