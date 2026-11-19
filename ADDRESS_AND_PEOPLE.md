# Free web address, sign-in and who can do what

No domain is bought. No college email and no ID check. Anyone can sign up with an email, verify it with a 6-digit code and vote. Hosts and volunteers are accounts you create with an email and a password.

---

## Part 1: The free web address

Cloudflare Pages gives every project a free address with HTTPS: **`https://<project-name>.pages.dev`** (see `HOSTING_CLOUDFLARE.md`).

| Step | What to do |
| --- | --- |
| 1. Choose the project name **first** | Short and easy to type, for example `fiesta26` (names are unique worldwide, so it may be taken; try `fiesta26-sdmcet` or `fiesta26live`). The name is part of every QR code, so **decide it before anything is printed** |
| 2. Create the Cloudflare Pages project with that name | Cloudflare → Workers & Pages → Create → Pages → connect the GitHub repo → name it. The address is shown after the first deploy |
| 3. Tell the login system | Supabase → Authentication → URL Configuration: Site URL = `https://<name>.pages.dev`, add `https://<name>.pages.dev/**` to Redirect URLs. `NEXT_PUBLIC_SITE_URL` in the Pages variables = the same. Google sign-in keeps using Supabase's own callback, so no change in Google Cloud |
| 4. Posters | Print posters and hunt stickers **only after** the address works and is final. Changing the project name later means reprinting every QR |
| 5. Keep it short | The QR is easier to scan with a short address. Keep a spare page (Home → "Open in browser") for people without a camera |

Later (optional, after the fest): buy a real domain and add it to Cloudflare Pages; the free address keeps working as a backup.

### Sending the sign-up codes without our own domain
See `AUTH_EMAIL_OTP.md` (sections 2 and 3). In short: Confirm email ON, the code in the email template, a custom SMTP sender that verifies a single address (Brevo free: about 300 a day, or a Gmail app password: about 500 a day), raised Supabase email and per-IP limits, long sessions, and **sign-up opened early** so the daily quota covers everyone.

---

## Part 2: Who can do what

| Person | How they become one | What they can do |
| --- | --- | --- |
| **Student** (anyone) | Signs up with email + password and a 6-digit code | Browse, **vote** (Vote button on the event page), play the **treasure hunt**, see Signals coming soon |
| **Volunteer** | The **admin creates the account** (email + password) on the Staff page | Everything a student can, plus the **Volunteer desk**: print the **hunt QR stickers**, see the **winners list** |
| **Host** (of one event) | The **admin creates the account** (email + password) and picks the event | The **Host home**: change **time, venue, status and registration window** of their event, turn **voting on or off** and manage the teams or people to vote for, see and upload **participants**, make the hunt stickers. Access ends on 30 Nov |
| **Admin** (you, the main admin; the admin page is yours alone) | You add your own email once in Supabase (`supabase/bootstrap_admin.sql`) and sign in with it | Everything: the **Admin page** (events, staff accounts, the **10 hunt places and their clues**, safety panel, polling slider, archive after the fest) |
| Organiser (optional) | The admin can create one for a committee head | Same as admin for events, voting and announcements; no staff accounts |

### How you become the admin (once)
1. Open `supabase/bootstrap_admin.sql`, replace `YOUR_EMAIL@gmail.com` with your own email, run it in Supabase's SQL Editor (after `schema_ops.sql`).
2. Sign up in the app with that email and the 6-digit code (then log in with the password). Your role becomes `admin` the moment the email is confirmed, and `/admin/` opens.
3. Nobody can make themselves admin from the app. Only the SQL Editor can.

### How you create hosts and volunteers
1. Admin page → **Staff** → choose Host or Volunteer, pick the event for a host, type their name, **email** and a **password** (the **Generate** button makes a good one) → **Create account**.
2. The account works at once (no email is sent). Give them the email and password yourself, for example on WhatsApp.
3. They sign in at the normal login page. They can change the password in My account. You can **Reset password** or **Remove access** from the same page.
4. This needs the small **staff Worker** (`workers/staff/`): the website cannot hold the secret key needed to create accounts. Only the admin's own login can use it (checked on every call).
5. The earlier "invite by email" functions (`invite_host`, `invite_volunteer`) still exist in the database but the app does not use them.

### The hunt places
The admin adds the 10 hunt places (hidden place name, clue, hint) on **Admin page → Hunt**, then volunteers print the stickers.

### Voting on or off
The **host of each competition** turns voting on or off and lists the teams or people on **Host home → Voting**. Nobody else needs to.

## Part 3: What changed from the earlier plan
- **Removed:** college email domain, "verified student" badge, roster list, ID check at a prize desk, stage code for voting.
- **Winners** are found from the leaderboard; a volunteer sees their name and email (screen 49) and contacts them. Minutes taken per player help spot cheating.
- The database still has unused leftovers (`college_verified`, optional poll switches). The app must not show them.
