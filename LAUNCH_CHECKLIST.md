# Launch checklist (everything that isn't code)

## Phase 0: Accounts and setup (19 Nov morning, about 1 hour)

### 0.1 Fest committee (do today)
- [ ] Meet the fest committee head. Agree that the app is the official live schedule, and that **2 organisers** will post updates on fest day (in shifts).
- [ ] Ask for the **full schedule in a Google Sheet by 21 Nov** using `templates/schedule_template.csv` (columns must match). Share the template with them.
- [ ] Get the fest name, logo (square PNG, at least 512×512) and brand colour.
- [ ] Get names and Google emails of the organisers who will post updates.

### 0.2 GitHub
- [ ] Create a free account (if needed) and a new **private** repository `fest-live`.

### 0.3 Supabase (database and login)
- [ ] Sign up at supabase.com → New project → name `fest-live`, region **Mumbai (ap-south-1)**, generate a strong database password and save it.
- [ ] SQL Editor → New query → paste `supabase/schema.sql` **after replacing `{{COLLEGE_DOMAIN}}`** (e.g. `coeptech.ac.in`) → Run. It should say "Success."
- [ ] Run `supabase/seed.sql` the same way (sample data for building; deleted on 24 Nov).
- [ ] Project Settings → API (or "API keys"): copy the **Project URL**, the **anon / publishable key** and the **service_role / secret key**. Keep the secret key private: never paste it in chat, WhatsApp or GitHub.

### 0.4 Google sign-in (the step people get wrong)
- [ ] Go to console.cloud.google.com → create a project `fest-live`.
- [ ] **Google Auth Platform / OAuth consent screen:** User type **External**; app name = fest name; support email = yours; scopes: only the defaults (email, profile, openid).
- [ ] **Publish the app ("In production").** In "Testing" mode only listed test users can sign in. With only the default scopes, publishing needs no Google review.
- [ ] **Credentials → Create credentials → OAuth client ID → Web application.** Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (shown in Supabase → Authentication → Providers → Google).
- [ ] Copy the Client ID and Client secret into Supabase → Authentication → Providers → **Google** → Enable → Save.
- [ ] Supabase → Authentication → **URL Configuration**:
  - Site URL: `http://localhost:3000` for now (change to the Vercel URL on 24 Nov)
  - Redirect URLs: `http://localhost:3000/**` and later `https://<your-app>.vercel.app/**`

### 0.4b Email sign-up (email + password accounts)
- [ ] Supabase → Authentication → Providers → **Email**: enabled, **Confirm email: ON**, minimum password length 8.
- [ ] **Custom SMTP** (Authentication → Emails → SMTP settings): Supabase's built-in sender is for testing only and allows very few emails per hour. A transactional email service with a free tier (e.g. Resend or Brevo) is enough; verify a sender address or domain first. Check current free limits.
- [ ] Edit the confirmation and reset-password email templates: fest name, one line, the button.
- [ ] Storage: run `supabase/storage.sql` (or create public buckets `event-covers` and `contestants` in the dashboard).

### 0.5 Your computer
- [ ] Node.js LTS installed (`node -v` shows 20 or newer), Git installed, Antigravity installed and signed in.
- [ ] Create a folder `fest-live`, copy in `PRD.md`, `PROJECT_RULES.md`, `PROMPTS.md`, `supabase/`, `templates/`.
- [ ] After Prompt 1.1, create `.env.local` from `.env.local.example` and paste the Supabase values. `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

### 0.6 Vercel (first deploy on 20 Nov, Prompt 2.3)
- [ ] Sign up at vercel.com with GitHub → Add New → Project → import `fest-live`.
- [ ] Environment variables: the same as `.env.local`, but `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`.
- [ ] Add the Vercel URL to Supabase Redirect URLs.
- [ ] Turn on Vercel **Web Analytics** for the project.

---

## Daily checks (19–23 Nov)

| Date | Done when |
| --- | --- |
| 19 Nov | Prompts 1.1–1.3 done; seed data shows on Home on your phone |
| 20 Nov | Prompts 2.1–2.3 done; Vercel link works over mobile data |
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
- [ ] Supabase → Authentication → URL Configuration: Site URL = Vercel URL.
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
| App owner (you) | | Watch Vercel and Supabase dashboards, fix bugs, answer organisers |
| Organiser shift 1 (8 am–2 pm) | | Post delays, announcements and results |
| Organiser shift 2 (2 pm–close) | | Same |
| Help desk volunteer | | Show students the QR; collect feedback |

**Every hour:**
- [ ] Open the app as a student. Is "Happening now" correct?
- [ ] Vercel → Deployments: no errors; Analytics: visitors climbing.
- [ ] Supabase → Reports: API and database fine.
- [ ] Admin → Signals: hide any reported or abusive Signal.

**If something breaks:**
| Problem | Do this |
| --- | --- |
| A page shows an error | Check Vercel logs. If the last deploy caused it, **Instant Rollback** to the previous deployment in Vercel |
| Sign-in fails | Check Supabase redirect URLs and the Google provider; browsing still works, so post an announcement |
| Data wrong or stale | The organiser re-saves the event (forces refresh); check the event's status and times |
| Supabase down | Public pages keep showing cached data. Post updates in the fest WhatsApp group too, until it's back |
| Spam Signals | Admin → Signals → Hide; it auto-hides after 3 reports |

**Backup plan:** keep a PDF/image of the schedule ready for the WhatsApp groups in case the site is unreachable.

---

## After the fest (26 Nov)

- [ ] Run Prompt 7.1 (metrics report) and compare with PRD section 3.
- [ ] Post a 3-question feedback form (what did you use, what was missing, would you use it every week for campus events and finding teammates?).
- [ ] Thank the committee and share the numbers. This is your case for making it the year-round campus app.
- [ ] Decide the next version: campus feed all year, Signals plus nearby and personal QR connect, Builds and communities.
