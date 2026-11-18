# Staff Worker (admin creates hosts and volunteers with email + password)

The website is static, so it cannot safely hold the Supabase service-role key. This Worker holds it and does three things, **only for the main admin**:

| Call | What it does |
| --- | --- |
| `POST /staff/create` `{ email, password, role, event_id?, full_name? }` | Creates a confirmed account with that password. `role` = `host` (needs `event_id`), `volunteer` or `organiser`. Sets the role or adds the host row |
| `POST /staff/reset-password` `{ user_id, password }` | Sets a new password for a staff member |
| `POST /staff/remove` `{ user_id }` | Takes the access away (role back to student, host rows deleted). The account stays |

Safety built in (tested offline with `node workers/staff/test.mjs`): the caller's own login token is checked with Supabase, then `profiles.role` must be `admin`; only your website's address may call it (CORS and Origin check); passwords need 8-72 characters with a letter and a number; passwords are never logged or returned; every action is written to the audit log (without the password); admins can't be removed here.

## Deploy (free)
1. `cd workers/staff`, set `ALLOWED_ORIGIN` in `wrangler.toml` to `https://<name>.pages.dev`.
2. `npx wrangler login` then `npx wrangler deploy`.
3. `npx wrangler secret put SUPABASE_URL`, `... SUPABASE_ANON_KEY`, `... SUPABASE_SERVICE_ROLE_KEY` (paste each value when asked; never paste them in chat).
4. The Worker address (`https://fiesta-staff.<your-account>.workers.dev`) goes into the website as `NEXT_PUBLIC_STAFF_API`.
5. Test: sign in as admin on the website, Admin -> Staff -> create a test volunteer, sign in as them in a private window.

Give each person their email and password yourself (WhatsApp is fine). They can change the password in My account.
