# Free web address, sign-in and who can do what

No domain is bought. No college email and no ID check. Anyone can sign in with an email or Google and vote. Hosts and volunteers are added by you, by email.

---

## Part 1: The free web address

Vercel gives every project a free address with HTTPS: **`https://<project-name>.vercel.app`**.

| Step | What to do |
| --- | --- |
| 1. Choose the project name **first** | Short and easy to type, for example `fiesta26` (it may be taken; try `fiesta26-sdmcet` or `fiesta26live`). The name is part of every QR code, so **decide it before anything is printed** |
| 2. Create the Vercel project with that name | Vercel → Add New → Project → import the GitHub repo → name it. The address is shown after the first deploy |
| 3. Tell the login system | Supabase → Authentication → URL Configuration: Site URL = `https://<name>.vercel.app`, add `https://<name>.vercel.app/**` to Redirect URLs. `NEXT_PUBLIC_SITE_URL` in Vercel = the same. Google sign-in keeps using Supabase's own callback, so no change in Google Cloud |
| 4. Posters | Print posters and hunt stickers **only after** the address works and is final. Changing the project name later means reprinting every QR |
| 5. Keep it short | The QR is easier to scan with a short address. Keep a spare page (Home → "Open in browser") for people without a camera |

Later (optional, after the fest): buy a real domain and add it to Vercel; the free address keeps working as a backup.

### Sending the confirmation email without our own domain
Without a domain you can't use services that need a verified domain. Do this:
- **Make "Continue with Google" the main button** (no email is sent at all). Most phones already have a Google account.
- For email + password, keep **"Confirm email" ON** in Supabase (this stops anyone signing up with someone else's address, including a host's). Turn on a **custom SMTP sender** that works with a single verified sender address: for example **Brevo** (free plan, verify one sender email) or a **Gmail account with an app password**. Their daily limits are only a few hundred emails a day (check the current numbers), so they can't carry 2,000 sign-ups in one morning. Supabase's built-in sender is far too small.
- Tell students at the gate: "Tap Continue with Google".
- If you really need thousands of confirmation emails in one day, you need a domain-based sender. Decide this by 22 Nov.

---

## Part 2: Who can do what

| Person | How they become one | What they can do |
| --- | --- | --- |
| **Student** (anyone) | Signs up with Google or email | Browse, **vote** (button on the event page), play the **treasure hunt**, see their account |
| **Volunteer** | An organiser invites their **email** (Admin → Hosts → Volunteer) | Everything a student can, plus: make and print the **hunt QR stickers**, see the **winners list** |
| **Host** (of one event) | An organiser invites their **email** for that event (Admin → Hosts → Host) | Update their event's **time, venue, status, registration window**, see/upload/export **participants**, make the hunt QR stickers. Access ends on 30 Nov |
| **Organiser** (2–3 people) | You set the role by hand in Supabase (Table editor → profiles) | Everything: events, voting on/off, hunt places, hosts and volunteers, the safety panel, archive |

Rules for invites:
- You provide the host and volunteer **emails**; the organiser types them in once.
- The person must **sign in with exactly that email** (Google is easiest) and the email must be **confirmed**. Typing someone else's address does nothing.
- If they already have an account, they get the role immediately. Otherwise it applies the first time they confirm that email.
- Every role change is logged.

## Part 3: What changed from the earlier plan
- **Removed:** college email domain, "verified student" badge, roster list, ID check at a prize desk, stage code for voting.
- **Winners** are found from the leaderboard; a volunteer sees their name and email (screen 49) and contacts them. Minutes taken per player help spot cheating.
- The database still has unused leftovers (`college_verified`, optional poll switches). The app must not show them.
