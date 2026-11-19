# Sign-in: email + password, verified with a 6-digit code

Everyone, students and staff, can use this login. **Google sign-in is an optional extra button** (see `GOOGLE_SIGNIN_OPTIONAL.md`); the email code is the main path and works in every browser, including Instagram and WhatsApp.

## 1. The flows
| Flow | What the person does | supabase-js call (browser) |
| --- | --- | --- |
| **Sign up** | Name, email, password, tick the box, **Create account** | `signUp({ email, password, options: { data: { full_name }, captchaToken } })` |
| **Verify** | Supabase emails a **6-digit code**. The person types it on the "Enter your code" screen | `verifyOtp({ email, token: code, type: 'signup' })` returns a session: the person is **signed in at once** |
| **Resend** | "Send a new code in 0:42" (one a minute) | `resend({ type: 'signup', email })` |
| **Log in** | Email + password (no email is sent) | `signInWithPassword({ email, password })` |
| **Forgot password** | Type the email, tap "Forgot password?", get a code, enter code + new password | `resetPasswordForEmail(email)` then `verifyOtp({ email, token, type: 'recovery' })` then `updateUser({ password })` |
| **Staff** (host, volunteer) | The admin created the account (already verified). They just log in with the email + password the admin gave them | `signInWithPassword` |

The 6-digit code replaces the confirmation link, so nothing depends on opening a link in the right browser. The person stays on the app page the whole time.

## 2. Supabase settings (Authentication)
1. **Providers → Email:** enabled, **Confirm email ON** (this is what makes sign-up send the code). Google and all other providers **off**.
2. **Email templates → "Confirm signup"** and **"Reset password"**: replace the link with the code `{{ .Token }}`. Example body: `Your Fiesta'26 Live code is <b>{{ .Token }}</b>. It works for a few minutes. If you did not ask for it, ignore this email.`
3. **OTP expiry:** set it to about 10 to 15 minutes if the dashboard shows the setting.
4. **SMTP (Authentication → Emails):** a custom sender is **required** (Supabase's own sender allows only 2 emails an hour and is only for testing). Without your own domain use a service that verifies a single sender address, for example **Brevo** (free plan, 300 emails a day) or a Gmail account with an app password (about 500 a day). Check the current limits.
5. **Rate limits:** raise the **email sent per hour** limit (a custom sender starts at about 30 an hour) and the **per-IP** limits for sign-ups/sign-ins and token verifications. The whole campus shares one IP, so the default per-IP numbers would block students. Check which of these your plan lets you change.
6. **Attack protection:** Cloudflare **Turnstile** on sign-up and password reset.
7. **Sessions:** keep people signed in for days (long refresh-token life), so a student receives **one** email in the whole fest, not one per visit.
8. URL configuration still needs the pages.dev address (for the password-reset email's fallback link), but no callback page is used in the normal flow.

## 3. The email limit is the real risk (read this)
Each sign-up costs **one email**. 2,000 students means about **2,000 to 2,400 emails** (some resend). A free sender sends roughly **300 a day (Brevo) or 500 a day (a Gmail account)**, and Supabase starts at about 30 an hour. All 2,000 people cannot sign up in the first morning. What to do:
- **Open sign-up now, not on the day.** Put the app link on WhatsApp groups, Instagram and posters from today: "Create your account before the fest". About 300 a day over the 7 days before 25 Nov is about 2,100.
- **One email per person for the whole fest:** long sessions, and password login afterwards (no email).
- **Friendly over-limit message.** When the sender is out of quota the app says "Too many sign-ups today. Please try again tomorrow, your account takes 20 seconds." and never shows a raw error.
- **Browsing, events, notices and the hunt clues need no account**, so being out of quota never blocks the schedule. Only voting, stamps and alerts need an account.
- **Know your counter:** watch the SMTP provider's daily count on the Safety panel day and raise the quota if you can (a second free account does not help: Supabase uses one sender).
- If the plan does not work, the fallback is to have a **domain-based sender** with a higher free quota (needs a domain: you said no), or to **turn Confirm email OFF** for the fest so sign-up sends no email (anyone can then use any email address; staff are not affected because the admin creates them as already verified).

## 4. What changes in the rest of the kit
Removed: Google OAuth setup, "Continue with Google" buttons, the in-app-browser warning sheet, the `/auth/callback/` page. Added: the "Enter your code" screen (04), the "New password" screen (09), the long-session setting, the email-capacity plan above. The database is unchanged: the code confirms the email, which fires the same triggers (an admin email in `staff_invites` becomes admin, and so on).
