# Security checklist to PASS before the student test

Goal: nobody can crash the app, cheat the points or votes, read other people's data, or learn internals from the network log. **Every box must be ticked. Anything failed = fix and run again.** Run the three automatic tests first, then do the manual items.

## 0. The three automatic tests (do these first)
| # | Test | How | Pass |
| --- | --- | --- | --- |
| T1 | **Attack test** (the database as each kind of user) | `bash security/run_security_tests.sh` (needs Postgres 16, run as a normal user; throw-away database) | `PASS | 102` and no FAIL line |
| T2 | **Privilege audit** (what each role may touch) | printed by the same script; also run `security/privilege_audit.sql` in the Supabase SQL Editor on your real project | Section 1 empty; sections 2-6 as the EXPECTED lines say; section 7 empty; section 9 shows the time limits; section 10 shows 0 on Supabase |
| T3 | **Live smoke test** (an attacker from outside, against your real site) | `SUPABASE_URL=... ANON_KEY=... SITE_URL=https://fiesta26.pages.dev STUDENT_EMAIL=... STUDENT_PASSWORD=... STAFF_API=... bash security/smoke_test.sh` | `RESULT: N passed, 0 failed` |
Also run `supabase/tests/run_tests.sh` (business rules) and `node workers/staff/test.mjs` (staff Worker): both must pass.
Use a **throw-away test student** for T3, never a real person. Run T1 and T2 after every change to a SQL file.

## A. What the network log shows (and why that is fine)
These are visible to anyone with browser dev tools. **They cannot be hidden**, so safety comes from the database rules, not from secrecy:
- The Supabase address and the **anon (public) key**. Safe only because every table has row level security and the functions check who is calling (T1 proves it).
- The names of the database functions the app calls (`cast_vote`, `claim_stamp`...). Safe: they refuse everyone who is not allowed.
- The signed-in user's **own** login token (only in their own browser).
Tick all of these:
- [ ] The **service-role key**, VAPID private key, SMTP password, Turnstile secret and Google client secret are **not** in the repository, the `out/` folder, any `NEXT_PUBLIC_*` variable or any network response (T3 section E).
- [ ] `NEXT_PUBLIC_*` variables contain only: Supabase URL, anon key, site URL, fest name, VAPID **public** key, Turnstile **site** key, staff API address.
- [ ] No request ever uses `select=*` on `profiles`, `signals`, `participants` or `stamp_points`; every query lists its columns (search the code for `select('*')`).
- [ ] No email, phone or token is put in a **web address** (query string). They go in the request body only.
- [ ] Responses contain only what the screen needs: `live_feed` has no emails or phones; the leaderboard has **no user ids** (it has `is_me`); `my_hunt` gives clues but **no place name until the place is found**; vote results are counts only; nobody can see who voted for whom (T3 section C).
- [ ] The Treasure Hunt sticker links are public by design; the **place names and clues are not in the network log** before a place is found (check the Network tab as a new player).
- [ ] No source maps in production (`productionBrowserSourceMaps` off; no `.map` files in `out/`; T3 checks for `sourceMappingURL`).
- [ ] No `console.log` of objects, tokens, emails or errors in the production build (search the code). Users see **friendly messages only**, never `error.message` from the database or raw JSON.
- [ ] Error pages and 404 pages do not show file paths, stack traces or table names.
- [ ] `.env`, `.git`, `supabase/` and `workers/` are not served by the website (T3 checks `.env`).

## B. Public data (signed out) must be exactly this
Tables/views a signed-out visitor may **read**: `app_config` (no secrets), `events` (published only), `venues`, `announcements`, `results`, `event_changes`, `polls` (not `secret`), `contestants`, `poll_results`, `poll_results_archive`, `stamp_hunt` (settings), `stamp_leaderboard`, `participants_public`, plus the functions `app_status`, `live_feed`, `my_hunt`. **Nothing else.** (T2 section 2 and T1.)
- [ ] Anonymous users can **never write** anything (T1, T3 section B).
- [ ] `participants` (emails, phones) is readable only by that event's host and admin/organiser.

## C. Nobody can cheat points, votes or roles
- [ ] **Roles:** a student cannot make themself admin, volunteer, host or "verified" (T1: 5 attacks). `admin` can only be created by `supabase/bootstrap_admin.sql`.
- [ ] **Stamps:** only `claim_stamp()` can add a stamp. Direct inserts, edits and deletes by students are refused. Tested limits: wrong code, unknown place, already collected, 6 a minute, 45 seconds between places, hunt closed.
- [ ] **Votes:** only `cast_vote()` can add a vote. One vote per account per poll, at most 3 changes 10 seconds apart, refused when voting is off or the fest is over, refused for a contestant of another poll.
- [ ] **Hunt cheating signals:** the winners list shows minutes taken; an organiser can delete stamps and **rotate a leaked code** (try it once).
- [ ] **Hosts** can only change their own event, their own voting and their own participants (T1: 9 host attacks). Limits: 20 edits an hour per event, 60 voting changes an hour.
- [ ] **Kill switch:** `writes_paused` stops votes and stamps within one poll; test it. Only the admin/organiser can flip it.
- [ ] After the fest the database refuses votes and stamps ("The fest is over").

## D. Nobody can crash or flood the app
- [ ] **Time limits:** `anon` 3 s and `authenticated` 8 s statement timeout (T2 section 9; Supabase defaults, also set in `schema_ops.sql`).
- [ ] **Row cap:** Supabase → Settings → API → **Max rows** set to 1000 or less. The app asks for `limit` on every list (the leaderboard asks for the top 20-50, never everything).
- [ ] **Field limits** are enforced by the database as well as the app (lengths, https-only links, time windows). Try a 10 MB text in an event description: it must be refused.
- [ ] **Uploads:** only jpeg/png/webp, covers ≤ 5 MB and contestant photos ≤ 2 MB (bucket limits), only admin/organiser can upload; the app resizes before upload. **CSV/Excel:** ≤ 5 MB and 5,000 rows, formulas read as plain text.
- [ ] **Per-person limits** exist in the database: stamps, votes, push (5 devices each, 30,000 in total), host edits, password/OTP attempts (Supabase Auth limits).
- [ ] **No per-IP limits in the app** (the whole campus shares one IP). Per-IP limits only on Supabase Auth, raised high enough (see `AUTH_EMAIL_OTP.md`).
- [ ] **Bots:** Cloudflare **Bot Fight Mode** on (Security → Bots, free), **Turnstile** on sign-up and reset, Cloudflare's free DDoS protection stays on. A rate-limiting rule on Cloudflare only if your plan includes it.
- [ ] **No endless loops or heavy polling:** polling uses `poll_seconds` with random jitter, pauses when the tab is hidden, backs off on errors; the slider in the Safety panel works.
- [ ] **A React error boundary** wraps every page so one broken component shows "Something went wrong, tap to retry", not a blank screen.
- [ ] **Backup mode:** with a wrong Supabase address the app still shows the last data (kill test), and `emergency.json` shows a banner within about 2 minutes.
- [ ] **Cost/limit alarms:** Supabase usage page bookmarked (egress, database size), Cloudflare analytics open on fest day.

## E. Sign-in and email
- [ ] Sign-up sends a 6-digit code; wrong, old or reused codes are refused with a friendly message; the email quota message works (`AUTH_EMAIL_OTP.md`).
- [ ] Passwords: 8+ characters with a letter and a number; generic errors that never say "no such email".
- [ ] **Confirm email is ON**; Supabase's built-in email sender is **not** used; the Brevo SMTP key is only in Supabase (`BREVO_SETUP.md`).
- [ ] Turnstile token is required for sign-up and password reset.
- [ ] Admin/organiser accounts have **two-factor (TOTP)** on.
- [ ] Sessions: sign-out and "sign out on all devices" work; the strict site policy below blocks injected scripts that could steal the saved login.
- [ ] Staff Worker: refuses no-login, a student, and another website (T3 + `node workers/staff/test.mjs`); passwords for staff are handed over privately and changed on first login.

## F. The website itself (Cloudflare Pages)
- [ ] `public/_headers` is deployed: Content-Security-Policy (no `unsafe-inline` scripts), HSTS, `nosniff`, referrer policy, permissions policy (camera only for our own pages), frame protection (T3 section E). Start from `security/_headers.example`; if you change an inline script, recompute its hash.
- [ ] Every link to another site uses `rel="noopener noreferrer"`.
- [ ] No `dangerouslySetInnerHTML`; user text is shown as text (try `<img src=x onerror=alert(1)>` as a name, an event description, a team name and a Signal: nothing runs).
- [ ] Redirect after login only to relative paths.
- [ ] `npm audit --omit=dev` shows no high or critical issues; the lock file is committed; a secrets scanner (gitleaks) runs before every commit.
- [ ] The GitHub repository is **private**, with two-factor on your GitHub, Cloudflare, Supabase and Google accounts.

## G. People, accounts and recovery
- [ ] Only 2-3 people know the Supabase and Cloudflare logins; each has two-factor on.
- [ ] You can rotate every secret in 10 minutes: Supabase keys, SMTP key, VAPID pair (steps written in `OPERATIONS.md`). After the fest: rotate the service-role key and the VAPID pair.
- [ ] Export of all data done on 24 Nov (free Supabase has no backups); you know how to restore it.
- [ ] Everyone who can post announcements knows the three emergency actions: delay an event, urgent notice, pause writes.
- [ ] The privacy policy and terms are live (`/privacy/`, `/terms/`) and the audit log shows role and config changes.

## H. Gate
**GO** only when: T1, T2, T3, the SQL tests and the Worker tests pass, every box above is ticked or has a written reason, and a friend has tried 10 minutes of "break the app" on a test account (double taps, back button, airplane mode, huge text, rotating the phone, two phones on one account) without finding a hole. **NO-GO** otherwise.
