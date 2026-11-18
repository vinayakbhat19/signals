# Audience voting

Students vote for their favourite performer or team in selected competitions (solo singing, group dance, battle of bands and so on). Everyone can see who's leading, live on their phone and on the stage screen.

**Voting is not on for every competition.** An organiser switches it on per competition, only where it makes sense.

## What organisers control (per competition)
| Setting | Options | Default |
| --- | --- | --- |
| Voting | On / off (one switch) | Off |
| Contestants | Name, subtitle (college, department or team members), optional photo, order | — |
| Opens / closes | A time, or "when switched on" and "when switched off" | Opens when switched on |
| Show results | **Live** · **After voting closes** · **Hidden** (organisers only, e.g. when votes are part of the judges' score) | Live |
| Who can vote | **College email only** or any signed-in Google account | College email only |
| Must be at the venue | Off / on: voters type the 6-character code shown on the stage screen, which changes every 30 s | Off |

Recommendation: for big crowd events, turn **"Must be at the venue" on.** It stops hostel rooms voting from a forwarded link, and it makes people watch the performance.

## Rules for voters (show on the voting screen)
- Sign in with Google to vote (browsing the app never needs sign-in).
- One vote per person per competition.
- You can change your vote up to 3 times while voting is open, then it locks.
- Votes are private: nobody sees who you voted for.
- Organisers may remove votes that look fraudulent.

## Anti-cheating (all enforced in the database)
| Trick | Why it fails |
| --- | --- |
| Voting many times | One vote per account per competition (database key) |
| Fake Gmail accounts | "College email only" (on by default) |
| Forwarded link, voting from far away | "Must be at the venue": code changes every 30 s, shown only on the stage screen |
| Rapid flip-flopping or scripts | At most 3 changes, 10 s apart; rate limits on the server |
| Inserting votes directly | Students can't write votes; only `cast_vote()` can, after all checks |
| Peeking at hidden results | `poll_results` returns counts only when visibility allows (organisers always) |

## Screens (see the design canvas)
- **Event page:** a "Vote now" banner when voting is on for that competition.
- **Vote** (`/vote/[eventId]`): contestant cards with a vote button and "Your vote" tag, live percentage bars (if results are live), total votes, closing countdown, the code box when required, and messages for every result (voted, changed, locked, college only, wrong code, closed).
- **Live votes hub** (in Home and the More menu): all competitions currently voting.
- **Stage screen** (`/screen/vote/[eventId]`, 16:9 for a projector): huge animated bars, leader highlighted, QR to vote, and the rotating venue code when that setting is on.
- **Organiser** (`/admin/voting`): every competition with an on/off switch, settings, contestants, live counts (always visible to organisers), "Close now", "Export results CSV", and fraud review (remove a vote).

## Data (written and tested: `supabase/schema_voting.sql`)
| Object | Purpose |
| --- | --- |
| `polls` | One per competition with voting: switch, times, visibility, college-only, venue code, hidden secret |
| `contestants` | Who can be voted for in that competition |
| `votes` | One row per voter per competition (private) |
| `cast_vote(poll, contestant, code)` | The only way to vote; runs every check and returns a friendly result |
| `get_vote_code(poll)` | Current venue code for the stage screen (volunteers and organisers only) |
| `poll_results` | Counts, percentages and totals, only when visibility allows |
| role `volunteer` | Can run stage screens and Stamp Stations, nothing else |

## Load
After a popular performance, hundreds of people may vote within a minute. That's a few writes per second, which Postgres handles easily, and each vote is one small row. Results are cached for 5 s (`s-maxage=5`, tag `votes:<eventId>`), so thousands of people watching the bars cost about one database read every 5 s per competition. The stage screen polls every 3 s.

## Offline voting (halls with no network): LATER

> **First launch:** not used. Voting is switched **off** for auditorium competitions and used only for outdoor competitions with mobile signal. The database functions below stay in `schema_voting.sql` unused, ready for a later event.


Our auditorium has a mobile-signal blocker and no Wi-Fi, so phones have **no network** inside. Voting still works:

| Step | Who | What happens |
| --- | --- | --- |
| Before the show (with signal) | Students | Open **Vote → the competition** once, signed in. The page, the contestants and the sign-in are saved on the phone. Best: Add to Home Screen first |
| Before the show (with signal) | Stage-screen volunteer | Open the stage screen for the competition. It downloads **all the codes for the show** (`get_vote_codes`, one per 30 s) and checks the laptop clock against the server |
| During the show (no network) | Stage screen | Keeps showing the rotating 6-character code from the downloaded list, with "Results after the show" instead of live bars |
| During the show (no network) | Students | Pick a contestant, type the code. The phone saves `{contestant, code, time, client_ref}` and shows **"Vote saved on your phone"** |
| After the show (signal again) | Phones | Send saved votes automatically: on Android in the background or on opening; **on iPhone when the app is opened again**. The student then sees "Your vote … was counted" or the reason it wasn't |
| After voting closes | Organiser | Waits ~20 minutes for votes to arrive (accepted up to **2 hours** after closing), checks fraud review, announces results |

**Why it's still fair** (enforced by `cast_vote_offline()`, tested):
- the typed code must belong to the 30-second window of the time the vote was made (±1 minute for phone clocks), so the voter must have seen the stage screen at that time;
- the vote time must be inside the voting window and not in the future;
- one vote per person (offline votes are final), retries don't double count (`client_ref`);
- college-email rule still applies;
- **fraud review:** `offline_vote_windows` shows votes per code window. A real audience spreads across many windows; a spike on one window means a photo of the code was shared outside. Organisers can remove those votes.

**Known limit:** someone who photographs the code and shares it can let a friend outside vote with that time, until 2 hours after closing. The college-email rule, one vote per person and the fraud review keep this small. Ask hosts to announce "the code is only valid in the hall".

**Set for offline competitions:** Show results = **After close**, Must be at the venue = **on**.
