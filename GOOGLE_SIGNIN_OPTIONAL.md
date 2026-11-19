# Google sign-in as an extra button (branded as Signals)

The login has two ways in: **Continue with Google** and **email + password with a 6-digit code** (`AUTH_EMAIL_OTP.md`). Google is optional: it sends no email, so it takes pressure off the daily email limit.

**The app is "Signals"** (the campus app that keeps running after the fest). Fiesta'26 Live is a temporary mode of Signals. So everything Google shows (name, logo, privacy policy, terms) is **Signals**.

## Google Cloud → Google Auth Platform
**Branding**
| Field | Value |
| --- | --- |
| App name | `Signals` |
| User support email | your email |
| App logo | `brand/signals-logo-120.png` (square, 120 x 120, under 1 MB) |
| Application home page | `https://fiesta26.pages.dev` |
| Privacy policy link | `https://fiesta26.pages.dev/privacy` (text in `legal/privacy.html`) |
| Terms of Service link | `https://fiesta26.pages.dev/terms` (text in `legal/terms.html`) |
| Authorised domains | `fiesta26.pages.dev` and your `<project-ref>.supabase.co` |
| Developer contact | your email |

**Audience:** External, then **Publish app** so the status is **In production**. In Testing only 100 listed users can sign in and their access expires after 7 days.
**Data access:** only the default permissions (openid, email, profile). Nothing else.
**Clients → Web application:** JavaScript origin `https://fiesta26.pages.dev`; redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Put the Client ID and secret into Supabase → Authentication → Providers → Google. Never paste the secret in chat.

Google may also show the Supabase address on its consent screen. Removing that needs a custom domain for Supabase, which costs money, so leave it.

## The web address and the Signals name
The address `fiesta26.pages.dev` stays the home of Signals after the fest, so the link and the Google settings keep working. If you want an address with the Signals name instead, create a **new Cloudflare Pages project with that name now**, before any QR sticker is printed, and use it everywhere (Pages projects cannot be renamed). Then update Google's authorised domain and the Supabase URLs.

## In the app
- Sign-up and log-in show **both**: "Continue with Google" and the email form.
- Google users get a normal account (no password, no code). Google sign-in is blocked inside Instagram/WhatsApp in-app browsers (`disallowed_useragent`): show the "Open in Chrome or Safari" sheet there and keep the email-code form beside it.
- The terms checkbox says "I agree to the Terms of Service and Privacy Policy" and links to `/terms` and `/privacy`.
- Callback: with Google the app needs the small static page `/auth/callback/` that finishes the sign-in in the browser (`exchangeCodeForSession`) and goes to `next` (relative paths only).
