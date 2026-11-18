# Security guide: Fiesta'26 Live

What we protect: students' names and emails, host registration lists (emails and phone numbers), votes (private), organiser access. What we don't collect: location, contacts, Aadhaar, payment details.

Rule of thumb: **the database enforces every rule; the app is just the front door.** Row Level Security (RLS) is on for every table, and the tests in `README.md` prove it. This guide covers everything around that.

---

## 1. Sign-in (authentication)

| Way in | How it works | Notes |
| --- | --- | --- |
| **Continue with Google** | Supabase Auth, Google OAuth, PKCE code flow in the browser (`supabase-js`) | Fastest for students. Google confirms the email |
| **Email + password** | Supabase Auth with **Confirm email ON** | Verified badge only after the confirmation link is clicked |
| **Organisers and admins** | Google sign-in + **TOTP two-factor (MFA)** | Enrol at `/account/security`; admin pages require the second factor once enrolled |

Configuration checklist (Supabase dashboard unless noted):
- [ ] Authentication → Providers → Google: enabled with your own OAuth client; Google consent screen **In production**; scopes only `openid email profile`.
- [ ] Authentication → URL Configuration: Site URL = the production URL; Redirect URLs = only `https://<your-app>/**` and `http://localhost:3000/**`. No wildcards for other domains.
- [ ] Email: Confirm email ON; minimum password length 8; custom SMTP (the built-in sender is for testing only).
- [ ] Authentication → Rate Limits: keep sign-up, sign-in, token refresh and email limits **at or below** the defaults; lower the email-send limit to what you need.
- [ ] Authentication → Attack Protection: turn on **CAPTCHA** (Cloudflare Turnstile or hCaptcha) for sign-up and password reset; turn on leaked-password protection if your plan offers it.
- [ ] Sessions: access token (JWT) expiry 1 hour, refresh-token rotation on (defaults).
- [ ] Sessions live in the browser's localStorage (static site, no server). Protect them with the strict CSP in `public/_headers` (no inline scripts, no third-party scripts except Turnstile and Cloudflare analytics) and never log tokens.

**Google blocks sign-in inside in-app browsers** (Instagram, WhatsApp, Facebook, Snapchat, LinkedIn, Telegram) with the error `disallowed_useragent`. Students who scan a QR from a story or a chat will hit this. The app must detect those browsers and show: "Open in Chrome or Safari to continue with Google", with a Copy link button and email + password as the alternative.

**Never reveal whether an email has an account** (same message for "wrong password" and "no such user"; same "check your email" message for reset).

## 2. Who can do what (authorisation)

| Role | Set by | Can |
| --- | --- | --- |
| visitor (no account) | — | read public pages, scan, see results that are visible |
| student | sign-up | vote, collect stamps, own profile |
| host | the **admin creates the account** (staff Worker) and picks the event | their event's time, venue, status, registration window, **voting on/off and teams**, participants; until `hosts_until` |
| volunteer | the **admin creates the account** (staff Worker) | print hunt QR stickers, see the winners list |
| organiser | the admin (optional, for a committee head) | events, voting, announcements |
| admin | **only** `supabase/bootstrap_admin.sql` in the SQL Editor | everything, including staff accounts, hunt places and the safety panel |

**Staff Worker rules:** only a caller whose own token resolves to `profiles.role = 'admin'` is accepted; the website's address is the only allowed origin; passwords need 8 to 72 characters with a letter and a number, are never logged or returned, and every action goes to `audit_log` without the password; admins cannot be changed there. Hand passwords over privately and tell staff to change them.

- Roles live in `profiles.role` and **can't be changed by the user** (column privileges). The app checks the role **in the database** for every admin/host page (`<RequireRole>`) and again inside every database function and policy, never from client data.
- Unauthorised visits to `/admin` or `/host` return **404**, not "forbidden".
- **Service-role key**: exists only as a secret of the Cloudflare push Worker. It is never in the website, the repository or any `NEXT_PUBLIC_` variable. Delete-my-account, push subscribe and purge are database functions.
- **Audit log** (`audit_log`): role changes, hosts added/removed, polls changed, events deleted, config changes (mode, pause, banner), archive/purge. Organisers can read it; nobody can edit it. Exports of participant lists are logged through a database function.

## 3. Rate limiting and abuse

Full table and fallback chain in `RESILIENCE.md` section 3. Summary of what's protected: sign-up, login, password reset, confirmation resend, push subscribe, stamps, votes, uploads, imports, admin writes, and the database functions' own limits. There are no per-IP limits in the app, because many students share one campus IP. Sign-in calls run from the browser. Sign-up and reset use Turnstile.

## 4. Web hardening

Set in `next.config` for all routes:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'`. Start in **Report-Only**, fix what it reports, then enforce |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(), payment=()` |

Also: all headers go in `public/_headers` (Cloudflare Pages), every input goes through zod in the browser and the database checks it again, no `dangerouslySetInnerHTML`.

## 5. Files and imports

- **Uploads** (event covers, contestant photos): JPEG/PNG/WebP only, 5 MB max, check the **real file signature** on the server, re-encode to strip metadata and scripts, random file names. The storage buckets also limit type and size (`storage.sql`).
- **Registrations (CSV/Excel)**: parsed in the browser; max 5 MB and 5,000 rows; formulas are read as plain values; on **export**, prefix any cell that starts with `=`, `+`, `-` or `@` with a single quote so a malicious name can't run a formula in Excel.
- Participants' emails and phones: visible only to that event's hosts and organisers (`participants` table), never through `participants_public`.

## 6. Secrets

- [ ] Only these are public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] Secrets (never in the website): `SUPABASE_SERVICE_ROLE_KEY` and `VAPID_PRIVATE_KEY` (Worker secrets), the SMTP key and `TURNSTILE_SECRET_KEY` (Supabase dashboard).
- [ ] `.env*` in `.gitignore`; GitHub secret scanning on; a pre-commit scan (gitleaks).
- [ ] Never paste a secret into chat, WhatsApp, a prompt or an issue. If one leaks: rotate it the same day (Supabase → Settings → API; Cloudflare secrets; VAPID pair).
- [ ] After the fest: rotate the service-role key and the VAPID pair.

## 7. Dependencies

`npm audit` shows no high or critical issues; lockfile committed; Dependabot on; every added package has a reason written in `DECISIONS.md`.

## 8. Privacy (India: DPDP Act 2023 and Rules 2025; main duties apply from May 2027, but build for them now)

- Collect only: name, email, avatar (Google), department (optional). No location, contacts or Aadhaar.
- **Consent and notice:** a plain-language notice at sign-up; separate, optional consent for alerts (push) and camera.
- **Retention:** after the fest the organiser runs **Archive and purge** (`archive_and_purge_fest`): individual votes, push subscriptions and participants' emails/phones are deleted; only aggregate results and the Stamp Hunt leaderboard stay.
- **User rights:** My account → edit profile, hide from the leaderboard, delete my account and data.
- **Breach plan:** if personal data leaks, tell the college and affected users, rotate secrets, and report as required (CERT-In expects reporting of cyber incidents within 6 hours; keep logs 180 days). Write the owner's phone number in the runbook.
- This is not legal advice: ask the college's legal/IT office to read the privacy notice before launch.

## 9. Security self-review (run before every test; paste the evidence)

Replace `$URL` and `$ANON` with your Supabase project URL and anon key.

| # | Check | Command / action | Pass |
| --- | --- | --- | --- |
| 1 | Anonymous user can't write events | `curl -s -X POST "$URL/rest/v1/events" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{"title":"x","category":"fun","starts_at":"2026-11-25T10:00:00Z","ends_at":"2026-11-25T11:00:00Z"}'` | error `42501` / row-level security |
| 2 | Anonymous user can't read private tables | `curl -s "$URL/rest/v1/participants?select=*" -H "apikey: $ANON"` and the same for `votes`, `push_subscriptions`, `push_queue`, `audit_log`, `rate_limits`, `host_invites` | `[]` or permission denied, never rows |
| 3 | Secrets are not readable | `curl -s "$URL/rest/v1/stamp_points?select=name,clue,code" -H "apikey: $ANON"` (must return nothing or permission denied) and `polls?select=secret` | permission denied |
| 4 | Public line-up has no emails | `curl -s "$URL/rest/v1/participants_public?select=email" -H "apikey: $ANON"` | column does not exist |
| 5 | Student can't make themselves admin | signed in as a student: `PATCH profiles?id=eq.<me>` with `{"role":"admin"}` | permission denied |
| 6 | Student can't vote twice or stamp directly | `POST /rest/v1/votes`, `POST /rest/v1/stamps` | permission denied |
| 7 | Service-role key isn't in the browser | search the built `out/` folder and page source for the key's first 20 characters | not found |
| 8 | `/admin`, `/host` as a student | open the URLs | 404 |
| 9 | Headers present | `curl -sI https://<app>/` | CSP, HSTS, nosniff, referrer-policy, permissions-policy |
| 10 | Rate limit works | 11 wrong logins in a minute | 429 with retry-after |
| 11 | Unconfirmed email can't be host | invite an email, sign up with it, don't confirm | no host access until confirmed |
| 12 | Upload checks | rename a `.txt` to `.jpg`, upload 8 MB image | both refused |
| 13 | CSV injection | participant named `=HYPERLINK("http://x","y")` → export → open in Excel | shown as text |
| 14 | `npm audit` | `npm audit --omit=dev` | no high/critical |
| 15 | Secret scan | `gitleaks detect` | none |

## 10. If something goes wrong

1. **Pause writes** (Safety panel → "Pause votes and stamps"): stops votes and stamps instantly; browsing keeps working. Put a banner up.
2. Rotate the leaked secret; sign everyone out if needed (Supabase → Authentication → Users → sign out).
3. Read `audit_log` to see who changed what.
4. Tell the committee head; write down the time and what you saw.
