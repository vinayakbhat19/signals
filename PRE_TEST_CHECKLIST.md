# Before we test with students: the gates

Every gate must pass **on the preview deployment** (not production). Mark each with PASS / FAIL and paste the evidence. Prompt **TEST.1** makes Antigravity run the automatable ones.

Legend: 🤖 the agent can check it · 📱 needs a person with a phone · 👥 needs the committee.

## A. Sign-in
- [ ] 🤖 Sign-up sends a 6-digit code; the right code signs the person in; a wrong or old code shows a friendly error; resend works after 60 s; password login and "Forgot password" (code + new password) work.
- [ ] 📱 Sign-up and the code entry work inside the **Instagram and WhatsApp in-app browsers**.
- [ ] 📱 Daily email quota: the SMTP provider's count and the "Too many sign-ups today" message are tested; the plan for opening sign-up early (`AUTH_EMAIL_OTP.md` section 3) is running.
- [ ] 🤖 Email sign-up: no Verified badge until the link is clicked; Gmail never gets the badge.
- [ ] 🤖 Wrong password 11 times in a minute → 429 with a friendly wait message; the error text never says whether the email exists.
- [ ] 🤖 Password reset works end to end; resend limited to 1 per minute.
- [ ] 📱 Confirmation email arrives within 1 minute from the **custom SMTP** sender (not the built-in one).
- [ ] 🤖 Organiser pages require MFA once enrolled; a student gets 404 on `/admin` and `/host`.
- [ ] 🤖 Sign out ends the session on that device; delete my account removes the profile, stamps and votes.

## B. Security
- [ ] 🤖 **`SECURITY_CHECKLIST.md` passes completely**: `security/run_security_tests.sh` (PASS 102, no FAIL), the privilege audit sections, and `security/smoke_test.sh` against the live site (0 failed).
- [ ] 🤖 All 15 checks in `SECURITY.md` section 9.
- [ ] 🤖 Security headers present; CSP enforced without console errors on every screen.
- [ ] 🤖 Service-role key and VAPID private key are not in the repository or the `out/` folder (they exist only as Worker secrets).
- [ ] 🤖 `npm audit --omit=dev` and `gitleaks` clean.
- [ ] 👥 Privacy notice read by someone from the college.

## C. Failure drills (do each on purpose)
- [ ] 🤖 Wrong Supabase URL → pages still show the last data with the backup banner.
- [ ] 🤖 Wrong Supabase URL in a local build → "Backup mode" with the last data; no crash. Edit `emergency.json`, deploy: the banner shows on a phone within about 2 minutes.
- [ ] 🤖 `writes_paused = true` → votes and stamps show the paused message; browsing works; banner appears within 20 s.
- [ ] 🤖 Emergency mode works with the database off (post an announcement; phone shows it).
- [ ] 📱 Phone in airplane mode: installed app opens, shows last data and "Offline".
- [ ] 📱 Block the camera permission: scanner shows the steps and "Take a photo" works.
- [ ] 📱 A hunt sticker is torn: reprint it from `/admin/hunt/qr`; the new sticker works and the link is the same. Rotate a code: the old sticker is refused.
- [ ] 👥 Rollback in Cloudflare Pages rehearsed once.

## D. Load
- [ ] 🤖 All k6 scenarios in `loadtest/` pass for **2,000 people at once** (readers, signin, vote, registration) on staging: see `PEAK_LOAD.md` section 7. No 429 for legitimate users (no low per-IP limits).
- [ ] 🤖 `supabase/tests/run_tests.sh` passes (hunt, volunteers by email, who can make QR, winners, open voting, host timing edits, limits, flood cap).
- [ ] 📱 A host changes a start time from screen 50: Home banner and push alert appear within 20 s.
- [ ] 🤖 1,200 votes in 60 s all counted once; no 5xx.

## E. Alerts and camera
- [ ] 📱 Android Chrome (browser and installed): turn on alerts, organiser delays an event, alert arrives within 10 s, tapping opens that event.
- [ ] 📱 iPhone (installed to Home Screen): same; in Safari outside the app the button shows the Add to Home Screen steps.
- [ ] 🤖 Expired subscription is removed after the next send; max 6 alerts per device per hour.
- [ ] 📱 Deny then re-allow notifications and camera from the browser settings; the app shows the right state each time.
- [ ] 📱 Camera light turns off when leaving the scanner.

## F. Hosts
- [ ] 🤖 `node workers/staff/test.mjs` passes. As admin create a host and a volunteer (email + password); each signs in and reaches only their own pages; a student token calling the staff Worker gets 403; a password reset and a removal work.
- [ ] 🤖 Host can't open another event's participants (404) and can't change time, venue or status.
- [ ] 🤖 Upload `templates/participants_template.csv` and an `.xlsx` of Google Forms responses; re-upload updates, not duplicates; errors shown per row.
- [ ] 🤖 Export is logged; a name starting with `=` is exported as text.
- [ ] 🤖 After `hosts_until` the host pages return 404; removing a host ends access at once.
- [ ] 👥 Every host has received `participants_template.csv` and knows how to export from Google Forms.

## G. Back to the Signals app (mode switch)
- [ ] 🤖 `app_status().mode` is `fest` now and flips to `campus` when `campus_from` passes (test on a copy: set it 2 minutes ahead).
- [ ] 📱 A phone left on Home flips to campus mode by itself within 20 s; the first visit shows the fest-over page once.
- [ ] 🤖 After the flip, voting and stamping are refused with "The fest is over".
- [ ] 🤖 `/fest-archive` shows winners and results; the Signals board (or the "coming soon" page, if Level B isn't ready) shows in campus mode.
- [ ] 🤖 "Archive and purge" refuses in fest mode; in campus mode the counts match and the contact numbers are gone; vote totals are kept.
- [ ] 🤖 `campus_from` is set back to **28 Nov 2026 00:00 IST** and `app_status()` says `fest`.

## H. Fest data and people
- [ ] 👥 Date, time and venue for all 21 competitions (see `FORMS_CHECK.md`); every Google Form fixed.
- [ ] 👥 Competitions chosen for audience voting (outdoor only) and 10 hunt places with clues; hosts' and volunteers' emails and passwords ready; you are the admin (`bootstrap_admin.sql` run, signed in once). Hosts know how to turn voting on and off.
- [ ] 👥 Free pages.dev address chosen and final; Supabase Site URL and redirects updated; hunt stickers and posters printed from that address; custom SMTP sender working (`ADDRESS_AND_PEOPLE.md`).
- [ ] 👥 Fest-week scaling checklist in `PEAK_LOAD.md` section 6 done (Supabase usage page, Auth limits, polling slider, backup, Worker deployed).
- [ ] 👥 Committee knows the three emergency actions: delay an event, post an urgent notice, pause writes.
- [ ] 👥 Owner's phone number is on the runbook; uptime alerts go to it.

**Go / no-go:** all 🤖 and 📱 items PASS, all 👥 items done, and no open FAIL. Otherwise we don't test with students.
