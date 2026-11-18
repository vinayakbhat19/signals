# Treasure Hunt (the Stamp Hunt)

A game for fest day: about **10 hidden places** on campus. Each place has a **QR sticker**. Students get a **clue** (and an extra **hint**), work out the place, go there and scan the QR to collect the stamp. Top hunters win prizes. It gets people walking around campus and gives everyone a reason to use the app.

**Priority:** part of the launch. Test data: `supabase/seed_hunt.sql` (10 sample places with clues). If your build shows a placeholder, use Prompt H.0.

## How it works (simple)
- A volunteer or host makes the QR stickers **once** (screen 46, "Hunt stickers"), prints them and sticks them up. **The QR never changes.** Nobody regenerates anything during the fest.
- The QR is open to everyone. Secrecy is not the point; finding the place is.
- The place name is **hidden** until the student scans it. They only see the clue.
- The QR opens the app at `/s/<place id>.<code>` (the code is a long random string, so nobody can guess a QR they haven't seen).

## Rules for players (put these on the Hunt page and the posters)
1. Sign in (Google or email) to play. Browsing needs no sign-in.
2. Read a clue, find the place, scan the QR sticker there. Tap "Need a hint?" if you're stuck.
3. **+10** per place, **+20** for finding all 10.
4. One stamp per place per person. You can scan places in any order.
5. After each scan wait about 45 seconds before the next one (the places are far apart anyway).
6. The hunt closes at **[TIME]**. Top hunters win **[PRIZES]**; volunteers contact winners by email.
7. Organisers can remove stamps that look like cheating. Their decision is final.

## Writing good clues (the fun part)
- One short riddle per place, plus an easier hint. Example: clue "Silence is loud here, and the stairs keep secrets." Hint "Books live inside."
- Don't put the place name on the sticker, and keep stickers at eye level, not in plain sight of the crowd.
- Test every clue with someone who has never seen the campus layout.
- 10 places in 3 days is a lot for one person: set `closes_at` for the end of the fest, or run 3 days with the same places.
- Optional: "one clue at a time" mode (`sequential`): only the next clue is shown after each stamp. Default is all clues open.

## How cheating is limited (honest version)
| Trick | What happens |
| --- | --- |
| Photo of a sticker shared on WhatsApp | The QR is static, so this **can't be fully stopped**. Limits: a gap of 45 s between scans, one stamp per place, max 6 claims a minute, and the winners list shows **minutes taken** (10 places in 6 minutes is suspicious). Organisers delete odd stamps; prizes are given by a person |
| A QR leaks online | An organiser **rotates** that place's code (`rotate_stamp_code`); the old sticker stops working; reprint that one sticker |
| Scanning the same place twice | One stamp per place per person (database key) |
| Scripts or spam | Rate limits, the 45 s gap, and students cannot insert stamps; only `claim_stamp()` can |
| Many fake accounts | Prizes go to real people you can email, and a volunteer can ask winners to show the clue places on their phone |

## Screens (see the design canvas)
- **Hunt** (`/hunt`, screen 22): points, rank, places found, the list of clues: found places show their name, the current clue shows a hint and a Scan button, later clues are collapsed. Top hunters preview.
- **Scan** (screen 20) and **result** (`/s/<id>.<code>`, screen 21): celebration, "+10!", progress, the next clue.
- **Hunt stickers** (`/admin/hunt/qr`, volunteers, hosts and organisers, screen 46): list of places with Print buttons and "Print all 10 (PDF)". Uses `list_stamp_qrs()`.
- **Winners** (`/admin/hunt/winners`, volunteers and organisers, screen 49): top hunters with name, email, places, score and minutes taken. Uses `hunt_winners()`.
- **Organiser editor** (`/admin/hunt`): add places (hidden name, clue, hint, "found" message, mascot, order), turn places on or off, rotate a code, open and close time, sequential mode, delete stamps.
- **Leaderboard** (`/hunt/board`, screen 23): big board for a TV, auto-refresh.

## Data (written and tested: `supabase/schema_stamps.sql`, `schema_ops.sql`)
| Object | Purpose |
| --- | --- |
| `stamp_hunt` | One row: name, open/close time, points, `min_gap_seconds`, `sequential` |
| `stamp_points` | One per place: hidden `name`, `clue`, `hint`, `found_text`, mascot, order, active, secret `code`. Students cannot read this table |
| `my_hunt()` | The passport: clues for everyone, place names only for places you have found |
| `claim_stamp(point, code)` | The only way to add a stamp; runs every check and returns a friendly result |
| `list_stamp_qrs()` / `get_stamp_qr(point)` | The sticker links, for volunteers, hosts and organisers |
| `rotate_stamp_code(point)` | Organiser replaces a leaked code |
| `hunt_winners(n)` | Top players with contact details and minutes taken (volunteers and organisers; logged) |
| `stamp_leaderboard` | First name + initial, stamps, score; hides people who opted out |

Tested on Postgres 16: clues visible to everyone, names hidden until found, wrong code, duplicate, 45 s gap, closed hunt, sequential mode, rotate (old sticker dead), who can make stickers (volunteer and host yes, student and non-host no), winners list, public leaderboard.

## Load
Scans are a few per second at most, straight to the database. Opening the Hunt page is one `my_hunt()` call. The leaderboard is cached 15 s.

## Volunteers
No screen duty. They print the stickers before the fest, stick them up, and keep a spare printout. They check each sticker is still in place each morning.
