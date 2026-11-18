# Fest Live: build kit

Everything needed to build **Fest Live** (the live fest guide plus the Signals "build together" board) with Antigravity, by 24 Nov 2026.

| File | What it is | When you use it |
| --- | --- | --- |
| `PRD.md` | Product requirements: goals, features, pages, data, limits | Read first; the agent reads it every phase |
| `PROJECT_RULES.md` | Rules for the coding agent: stack, caching, security, UI, how to report | Add as an Antigravity rule; copy into the project |
| `PROMPTS.md` | Copy-paste prompts, phase by phase, each with "You check" steps | 19–26 Nov, one prompt at a time |
| `LAUNCH_CHECKLIST.md` | Accounts, Google sign-in setup, student test, go-live, fest-day runbook | Phase 0 (today) and 23–26 Nov |
| `supabase/schema.sql` | Database tables, triggers and security rules (tested on Postgres 16) | Run once in the Supabase SQL editor |
| `supabase/seed.sql` | Sample venues, events, announcements and a live score | During building; deleted on 24 Nov |
| `templates/schedule_template.csv` | Columns for the committee's schedule sheet | Send to the committee today |

## Order
1. Fill in the placeholders: `{{FEST_NAME}}`, `{{COLLEGE_NAME}}`, `{{COLLEGE_DOMAIN}}`, `{{BRAND_COLOR}}`.
2. `LAUNCH_CHECKLIST.md` → Phase 0 (committee, GitHub, Supabase, Google sign-in).
3. `PROMPTS.md` → Phase 1 to Phase 7, checking each phase on your phone before the next.

## What was tested in the schema
On a local Postgres 16 with stand-ins for Supabase's auth:
- profiles are created on sign-in, with the verified-student flag from the email domain;
- visitors can read but not write fest data; only organisers can write it;
- users can't change their own role;
- Signal author names come from the profile, not the client;
- a 4th open Signal is refused;
- a Signal's contact is hidden: `select *` is refused, and the contact is returned only to the poster, accepted responders and organisers;
- responders can't accept themselves; posters can't respond to their own Signal or hide it;
- a Signal is hidden automatically after 3 reports.

The real Supabase project may differ slightly from that stand-in. If a statement fails when you run it, paste the error into Antigravity with the Fix prompt.

## Deploy (Vercel)

Set these exact environment variables in **Vercel → Project Settings → Environment Variables** (for Production and Preview):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Publishable / `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Secret / `service_role` key *(Server-only; never prefix with `NEXT_PUBLIC_`)* |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` (no trailing slash) |
| `NEXT_PUBLIC_FEST_NAME` | `Fiest 2026` |
| `NEXT_PUBLIC_COLLEGE_NAME` | `SDM College of Engineering & Technology, Dharwad` |

After importing into Vercel:
1. Enable **Web Analytics** in the Vercel dashboard for the project.
2. In **Supabase → Authentication → URL Configuration**, add `https://<your-app>.vercel.app/**` to **Redirect URLs** (and switch **Site URL** to `https://<your-app>.vercel.app` before go-live).

