# Launch checklist (everything that isn't code)

## Phase 0: Accounts and setup (19 Nov morning, about 1 hour)

### 0.1 Fest committee (do today)
- [ ] Meet the fest committee head. Agree that the app is the official live schedule, and that **2 organisers** will post updates on fest day (in shifts).
- [ ] Ask for the **full schedule in a Google Sheet by 21 Nov** using `templates/schedule_template.csv` (columns must match). Share the template with them.
- [ ] Get the fest name, logo (square PNG, at least 512×512) and brand colour.
- [ ] Get names and emails of the organisers who will post updates.

### 0.1b Free web address and people (do today, before anything is printed)
- [ ] Pick the Cloudflare Pages project name (it becomes `https://<name>.pages.dev`). Follow `ADDRESS_AND_PEOPLE.md` Part 1 and `HOSTING_CLOUDFLARE.md`. **Print hunt stickers and posters only after the address is final.**
- [ ] **Make yourself the main admin:** put your own email in `supabase/bootstrap_admin.sql`, run it in the SQL Editor after `schema_ops.sql`, then sign in to the app once with that email.
- [ ] Collect the **emails of hosts and volunteers** and choose a password for each (`ADDRESS_AND_PEOPLE.md` Part 2). You create the accounts yourself on Admin page → Staff; no one has to confirm an email. Hand over the passwords privately (WhatsApp).
- [ ] Write the 10 hunt places, clues and hints (`STAMP_HUNT.md`).
- [ ] Hosts update their own event timings (screen 50); tell each host how.

### 0.2 GitHub
- [ ] Create a free account (if needed) and a new **private** repository `fest-live`.

### 0.3 Supabase (database and login)
- [ ] Sign up at supabase.com → New project → name `fest-live`, region **Mumbai (ap-south-1)**, generate a strong database password and save it.
- [ ] SQL Editor → New query → paste `supabase/schema.sql` (the college domain stays empty: there is none) → Run. It should say "Success."
- [ ] Run `supabase/seed.sql` the same way (sample data for building; deleted on 24 Nov).
- [ ] Project Settings → API (or "API keys"): copy the **Project URL**, the **anon / publishable key** and the **service_role / secret key**. Keep the secret key private: never paste it in chat, WhatsApp or GitHub. It goes **only** into the push Worker as a secret; never into the website or Cloudflare Pages variables.

### 0.4 Sign-in by email + code (no Google). Details: `AUTH_EMAIL_OTP.md`
- [ ] Supabase → Authentication → Providers → **Email**: enabled, **Confirm email ON**. **Do not enable Google** or any other provider.
- [ ] Authentication → Emails → **Templates**: "Confirm signup" and "Reset password" show the 6-digit code `{{ .Token }}` instead of a link (text in `AUTH_EMAIL_OTP.md`).
- [ ] **Brevo (free) or a Gmail app password** as the custom SMTP sender (see 0.4b). Send yourself a test sign-up and read the code.
- [ ] Authentication → **Rate Limits**: raise the emails-per-hour limit and the per-IP sign-up/sign-in/verification limits as far as the plan allows.
- [ ] Sessions: long refresh-token life, so each student gets only **one** email in the whole fest.
- [ ] **Open sign-up now** (WhatsApp groups, Instagram, posters): "Create your account before the fest". The free sender can only send a few hundred codes a day, so sign-ups must be spread over the days before 25 Nov.

### 0.4b Email sign-up (email + password accounts)
- [ ] Supabase → Authentication → Providers → **Email**: enabled, **Confirm email: ON**, minimum password length 8.
- [ ] **Custom SMTP** (Authentication → Emails → SMTP settings): Supabase's built-in sender is for testing only and allows very few emails per hour. Without our own domain use a service that verifies a single sender address (for example Brevo) or a Gmail account with an app password. Their daily limits are small (a few hundred), so **Google sign-in is the main button**. Keep "Confirm email" ON. Check current limits.
- [ ] Edit the confirmation and reset-password email templates: fest name, one line, the button.
- [ ] Storage: run `supabase/storage.sql` (or create public buckets `event-covers` and `contestants` in the dashboard).

### 0.4c Security and reliability accounts
- [ ] **Cloudflare Turnstile** (free): create a widget for the pages.dev address; site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret → Supabase Authentication → Attack Protection (CAPTCHA) and `TURNSTILE_SECRET_KEY`.
- [ ] **Web Push keys:** run `npx web-push generate-vapid-keys`; public → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private → `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:<committee email>`.
- [ ] **Emergency control panel:** the committee head and you get write access to the GitHub repo (to edit `public/emergency.json` from a phone).
- [ ] **Uptime monitor** (UptimeRobot or Better Stack, free): check the static `/status` page every minute, alert to your phone.
- [ ] Supabase: Authentication → Rate Limits and Attack Protection set as in `SECURITY.md` section 1; Authentication → enable MFA (TOTP) for organisers.
- [ ] Run `supabase/schema_ops.sql` **last** (after all the other SQL files). Check `app_config`: `campus_from` = 2026-11-28 00:00 IST, `hosts_until` = 2026-11-30 23:59 IST.
- [ ] Set your own account's role to `admin` in the dashboard; make the committee head `organiser`.

### 0.5 Your computer
- [ ] Node.js LTS installed (`node -v` shows 20 or newer), Git installed, Antigravity installed and signed in.
- [ ] Create a folder `fest-live`, copy in `PRD.md`, `PROJECT_RULES.md`, `PROMPTS.md`, `supabase/`, `templates/`.
- [ ] After Prompt 1.1, create `.env.local` from `.env.local.example` and paste the Supabase values. `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

### 0.6 Cloudflare Pages and the push Worker (first deploy on 20 Nov, Prompt 2.3)
- [ ] Sign up at cloudflare.com (free) → Workers & Pages → Create → Pages → connect GitHub → `fest-live`. Build command `npm run build`, output directory `out`.
- [ ] Environment variables: only `NEXT_PUBLIC_*` ones, with `NEXT_PUBLIC_SITE_URL=https://<name>.pages.dev`. **Never the service-role key.**
- [ ] Add the pages.dev address to Supabase Redirect URLs.
- [ ] Turn on Cloudflare **Web Analytics** (a one-line script, no cookies).
- [ ] Deploy the **staff Worker** first (`workers/staff/`, README inside; run `node workers/staff/test.mjs`), then the push Worker (`workers/push/`, Prompt N.1). The staff Worker's address becomes `NEXT_PUBLIC_STAFF_API`.
- [ ] Supabase free plan: no backups, pauses after a week unused: set a reminder to open the project every few days and export on 24 Nov.

---

## Daily checks (19–23 Nov)

| Date | Done when |
| --- | --- |
| 19 Nov | Prompts 1.1–1.3 done; seed data shows on Home on your phone |
| 20 Nov | Prompts 2.1–2.3 done; the pages.dev link works over mobile data |
| 21 Nov | Prompts 3.1–3.3 done; **real schedule imported**; organisers' accounts set to `organiser` |
| 22 Nov | Prompts 4.1–4.3 done; two-account Signals test passed; QR scanned from paper |
| 23 Nov | Prompts 5.1–5.3 done; student test done; no open bugs |

---

## Student test (23 Nov, about 1 hour)

- [ ] Gather 20–30 students: Android and iPhone, at least 3 on slow mobile data.
- [ ] Give them tasks without explaining the app:
  1. Scan this QR. What's happening right now?
  2. When and where is the cricket final?
  3. Star 3 events. Open your schedule.
  4. Post a Signal: "Need a teammate for the hackathon."
  5. Respond to someone else's Signal.
  6. Add the app to your home screen.
- [ ] Watch silently and note where they hesitate, plus every bug (phone, browser, screenshot).
- [ ] Organiser drill: an organiser delays an event and posts an urgent announcement. **Time it** (target: under 30 seconds to appear on students' phones).
- [ ] Paste the notes into Prompt 5.3.

---

## Go-live (24 Nov)

- [ ] Delete seed data (SQL from Prompt 6.1) and import the final schedule. Check 5 random events against the committee's sheet.
- [ ] Supabase → Authentication → URL Configuration: Site URL = the pages.dev address.
- [ ] Set all organisers' `role` to `organiser` (Table editor → profiles; they must sign in once first).
- [ ] Print QR posters (Prompt 4.3 page):
  - [ ] 1 big "Scan for the live schedule" poster at each entrance and the help desk
  - [ ] 1 QR at each venue door (venue QR)
  - [ ] QR on the fest's Instagram story and in college WhatsApp groups with a one-line message
- [ ] Final check on 3 phones over mobile data: Home, Schedule, an event, sign-in, star, Signal.
- [ ] Organisers read `OPERATIONS.md` and do one practice update each.
- [ ] Freeze: no new features after 9 pm. Only bug fixes, each tested on a preview deploy before production.

---

## Fest day runbook (25 Nov)

**Roles**
| Role | Person | Job |
| --- | --- | --- |
| App owner (you) | | Watch the Supabase usage page and Cloudflare analytics, fix bugs, answer organisers |
| Organiser shift 1 (8 am–2 pm) | | Post delays, announcements and results |
| Organiser shift 2 (2 pm–close) | | Same |
| Help desk volunteer | | Show students the QR; collect feedback |

**Every hour:**
- [ ] Open the app as a student. Is "Happening now" correct?
- [ ] Cloudflare → Deployments: no errors; Web Analytics: visitors climbing.
- [ ] Supabase → Usage: egress, API requests and database fine (egress under 70% of the month).
- [ ] Admin → Signals: hide any reported or abusive Signal.

**If something breaks:**
| Problem | Do this |
| --- | --- |
| A page shows an error | If the last deploy caused it, roll back to the previous deployment in Cloudflare Pages (Deployments → Rollback) |
| Codes not arriving / "too many sign-ups" | Check the SMTP provider's daily count and Supabase's email rate limit; browsing still works; people who already have an account log in with their password (no email); post an announcement |
| Data wrong or stale | Phones refresh at their next check (about 30 s); the organiser re-saves the event; check the event's status and times |
| Supabase down | Phones keep showing the last data in "Backup mode". Edit `public/emergency.json` on GitHub for banners and delays, and post in the fest WhatsApp group until it's back |
| Spam Signals | Admin → Signals → Hide; it auto-hides after 3 reports |

**Backup plan:** keep a PDF/image of the schedule ready for the WhatsApp groups in case the site is unreachable.

---

## Voting plan for the fest
- [ ] With the committee, list the competitions that get audience voting: **outdoor only** (where phones have signal).
- [ ] Leave voting **off** for every auditorium competition (signal blocker, no Wi-Fi). Results there come from the judges as usual.
- [ ] Test voting on a phone at each outdoor venue the day before.

## After the fest (26 Nov)

- [ ] Run Prompt 7.1 (metrics report) and compare with PRD section 3.
- [ ] Post a 3-question feedback form (what did you use, what was missing, would you use it every week for campus events and finding teammates?).
- [ ] Thank the committee and share the numbers. This is your case for making it the year-round campus app.
- [ ] Decide the next version: campus feed all year, Signals plus nearby and personal QR connect, Builds and communities.
