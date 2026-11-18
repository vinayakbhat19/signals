# Hosts, and coming back to the Signals app after the fest

Screens: **47 Manage hosts**, **48 Safety panel**, **60 Fiesta'26 is a wrap**. Prompts: **HOST.1**, **END.1**, **END.2**. Database: `schema_ops.sql` (tested).

---

## Part 1: Host management

A **host** is the person running one competition (a club coordinator). They are **not** organisers.

| | |
| --- | --- |
| Who invites | Organisers, at **Admin → Hosts** (`rpc invite_host(event, email)`) |
| How it becomes active | The invited person signs in with **that email** (Google, or email + password) and the email is **confirmed**. If they already have a confirmed account they become a host immediately. **Unconfirmed sign-ups never count**, so nobody can become a host by typing someone else's email |
| What a host can do | For **their events only**: upload registrations (CSV/Excel from Google Forms), check people in, mark on stage/performed/withdrawn, set the performing order, show or hide the line-up, export CSV/Excel |
| What a host can't do | Change times, venues or cancel (organisers do that, so students are alerted correctly); see other events' participants; see who voted for whom |
| How long | Until `app_config.hosts_until` (default **30 Nov 11:59 PM IST**: three days after the fest, so they can export). After that the host pages return 404 |
| Removing | Organiser removes the host (access ends at once) or cancels a pending invite |
| Logging | Host added/removed, exports and config changes go into `audit_log` |
| Suggested setup | One host per competition, two at most. Send each host `templates/participants_template.csv` and the instructions to export Google Forms responses |

Flow: Admin → Hosts → pick event + email → **Send invite** → the host receives an email → signs in → `/host` (their events) → participants page.

---

## Part 2: After the fest, the app goes back to the Signals app

**When:** automatically at **28 Nov 2026, 12:00 AM IST** (`app_config.campus_from`). No cron job: every check compares with the database clock. Fest mode before, campus mode after. Organisers can also force either mode or **preview campus mode only for themselves**.

| | Fest mode (until 27 Nov) | Campus mode (from 28 Nov) |
| --- | --- | --- |
| Name and look | Fiesta'26 Live, Fiesta logo and colours | The campus Signals app (its own name and logo; Fiesta stays only in the archive) |
| Bottom bar | Home · Events · **SCAN** · Vote · Hunt | Home · Events · **SCAN** · **Signals** · Me |
| Home | Live now, up next, change alerts, hunt card | Signals board, campus events, "Fiesta'26 memories" card |
| Voting | On for chosen outdoor competitions | **Closed** (database refuses new votes) |
| Stamp Hunt | Open | **Closed**; leaderboard frozen and shown in the archive |
| Hosts | Active | Until 30 Nov, then off |
| Alerts (push) | Event changes | Subscriptions deleted at purge; people are asked again for campus alerts |
| QR scanner | Stamps, votes, events | Events and (later) people connect |

What closes automatically (database triggers, tested): `votes` and `stamps` accept **no new rows** once the mode is campus, and also when **writes are paused**. The app shows the message "The fest is over".

### The fest-over page (screen 60) and the archive
First visit after the switch shows **"What a wrap!"**: Stamp Hunt winners, audience favourites, a link to the archive, and the big **Open Signals** button. `/fest-archive` keeps: winners, vote totals, the 21 competitions and their results, a thank-you note.

### Clean-up (organiser, once, after the switch)
`Safety panel → Archive results + delete personal data` runs `archive_and_purge_fest()` (typed confirmation). It:
- **keeps:** final vote totals per contestant (`poll_results_archive`), the Stamp Hunt leaderboard, events and results;
- **deletes:** every individual vote, all push subscriptions and the queue, rate-limit rows, and participants' **emails and phone numbers**;
- logs the counts in `audit_log`.
It refuses to run unless the app is in campus mode.

### What the Signals app needs by 28 Nov
| Level | What | Status |
| --- | --- | --- |
| **A (must)** | Mode switch, fest-over page, archive, votes/stamps closed, purge | Built in END.1; **database tested** |
| **B (should)** | Signals board, Raise a Signal, "I'm interested", accept, report; My schedule | Screens exist (90–92) and tables exist in `schema.sql`; build with END.2 (Prompts 4.1 and 4.2 restyled) |
| **C (later)** | Nearby, personal QR connect, communities, Builds, companies | After the fest, per `PRD.md` "Later" |

**Honest note on timing:** the fest is 25–27 Nov; the switch is 28 Nov 12:00 AM. If Level B isn't finished and tested by the evening of 27 Nov, set `campus_from` later (Safety panel) or let campus mode show the fest-over page with "Signals is coming back soon" for a few days. Don't ship an untested Signals board, because the first thing it will meet is real students' contact details.

### Test the switch before the fest
1. On a copy of the database, set `campus_from` to 2 minutes from now; a phone left on Home should flip by itself within 20 s.
2. Try to vote and stamp after the flip (must be refused).
3. Run the purge and compare the counts.
4. Set `campus_from` back to 28 Nov 12:00 AM IST and confirm `app_status()` says `fest`.
