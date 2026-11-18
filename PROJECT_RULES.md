# Project rules for the coding agent (Fest Live)

Read this file and `PRD.md` (especially section 0, the launch scope) before every task. If a request conflicts with these rules, stop and ask.

## Hosting (read HOSTING_CLOUDFLARE.md first: it overrides anything else that mentions Vercel, ISR or API routes)
- **Static site on Cloudflare Pages + Supabase. No server.** Next.js with `output: 'export'`, TypeScript strict, Tailwind CSS, shadcn/ui.
- Supabase via `@supabase/supabase-js` in the browser only. No `@supabase/ssr`, no cookies, no service-role key in the website.
- Libraries allowed: `swr` (or plain fetch), `zod`, `papaparse`, `qrcode`, `date-fns`, `date-fns-tz`, `lucide-react`. Ask before adding anything else. No Vercel packages, no Upstash.
- Package manager: npm.
- Forbidden in the website: API routes, route handlers, server actions, middleware, `cookies()`/`headers()`, `revalidate`, `generateStaticParams` for events, `next/image` optimisation, dynamic `[id]` folders.

## Folder layout
```
app/                  static pages (no [id] folders; ids come from the query string)
  event/ vote/ s/ venue/ lineup/ hunt/ events/ account/ admin/ host/ auth/callback/ ...
components/           UI components (components/ui = shadcn)
lib/supabase.ts       the one browser client
lib/data/             data-access functions (calls to rpc / views; one file per area)
lib/time.ts           all date/time helpers (Asia/Kolkata)
lib/validation.ts     zod schemas
public/               _headers, covers/, live-fallback.json (written at build), emergency.json, sw.js, brand/
workers/push/         the Cloudflare Worker that sends alerts (the only server code)
supabase/             schema.sql ... schema_ops.sql, seed (already written; do not rewrite)
```

## Data and caching (most important for fest day)
1. Public data comes from `rpc('app_status')` (tiny, polled) and `rpc('live_feed')` (fetched when `version` changes). Phones never poll anything else on public pages.
2. Polling: every `poll_seconds` from `app_status` (default 30) with ±30% jitter, paused when the tab is hidden, exponential back-off to 120 s on errors. No Realtime.
3. Writes are single RPC calls (`cast_vote`, `claim_stamp`, `host_update_event`, ...), idempotent, retried with jitter on network errors.
4. The last good `live_feed` is kept in localStorage; if Supabase fails, show it with "Backup mode".
5. Organiser edits go straight to Supabase from the browser (RLS decides); the database bumps `data_version`, so every phone sees the change at its next check.

## Reliability
- Fallback order for reads: Supabase → localStorage copy → `public/live-fallback.json` (written at build) → `public/emergency.json` overlay (edited on GitHub).
- Votes are added only through `rpc('cast_vote')`; never select `secret` from `polls`; never show who voted for whom.

## Safety and failure (see SECURITY.md, RESILIENCE.md)
- Admin/host pages check the role by calling the database; the database re-checks on every write. Not allowed = empty "Not allowed" page.
- No per-IP limits in the app. Limits are in the database functions and Supabase Auth.
- Mode comes from `app_status()` (database), never from a date check in the browser. Votes and stamps may be refused ('The fest is over', 'Writes are paused'): show those messages.
- Permissions (notifications, camera) are requested only after a tap and an explanation; stop camera tracks when leaving the scanner.
- Push tables, `rate_limits`, `audit_log`, `host_invites` and `staff_invites` have no client access.

## Security
- Row Level Security is already defined in `supabase/schema.sql`. Do not disable it and do not rely on the UI alone: every server action checks the user and role again.
- **Never `select('*')` from `signals`.** List the columns. The `contact` column is not readable; get it with `supabase.rpc('get_signal_contact', { p_signal_id })`.
- After inserting into `signals` or `signal_responses`, select only `id` (`.select('id')`).
- `SUPABASE_SERVICE_ROLE_KEY` is used **only** inside the Cloudflare push Worker (as a Worker secret). It must never appear in the website code, the repository or any `NEXT_PUBLIC_` variable.
- Validate every form with zod in the browser (the database also checks lengths and values). Escape nothing by hand: render text as text, never `dangerouslySetInnerHTML`.
- Do not store or ask for phone numbers, Aadhaar, location or anything not in the PRD.
- Never read the `stamp_points` table from the client (it holds hidden place names, clues and codes); the passport comes from `rpc('my_hunt')`; stamps are added only through `rpc('claim_stamp')`.
- Students read participants only through `participants_public`; emails and phones are for hosts and organisers only.

## Time
- All times are stored as `timestamptz` and shown in **Asia/Kolkata** via helpers in `lib/time.ts` (`formatTime`, `formatDay`, `isLive`, `toIstDate`). Never use the server's local time zone.
- "Now" on the client comes from `server_time` in `app_status` plus elapsed time, so wrong phone clocks don't break "Happening now."

## UI
- Follow the attached design screenshots and **BRAND.md** (official Fiesta'26 look: logo from `brand/`, background #0B0A12, cards #1F1230, borders #3B2758, text #F4F2FA, accent Fiesta yellow #FFD60A, Fiesta pink #FF4FD8, purple halftone header #32194A; big titles in Bungee, headings Bricolage Grotesque 800, body Inter; mascots as inline SVG with CSS animations, off under prefers-reduced-motion). Dark mode only. App name: **Fiesta'26 Live**.
- Mobile first: design at 390 px wide, then check 768 px and 1280 px.
- Bottom tab bar on mobile: Home, Events, SCAN (raised centre button), Vote, Hunt. My account opens from the avatar on Home. Follow `APP_FLOW.md` for every route and link.
- Category colours: tech cyan, cultural pink, sports lime, workshop orange, talk violet, fun yellow, official grey.
- Tap targets ≥ 44 px; text contrast WCAG AA; images are plain `<img loading="lazy">` with width and height, thumbnails for lists.
- Every list has a loading skeleton and an empty state with a helpful sentence.
- Keep public pages light: no heavy animation libraries; JS under 200 KB gzip.

## Code quality
- Small components, typed props, no `any`.
- Data access only in `lib/data/*`; components never build queries.
- Errors: show a friendly message plus a retry button; log details with `console.error` on the server.
- Before saying a task is done: run `npm run lint`, `npm run build` (must produce `out/`), and check the feature in the browser at 390 px. Report what you checked.

## Working style
- Do one phase at a time. At the end of a phase: summarise what changed, list files, list what you tested, and list anything not done.
- Commit after each phase with a clear message (`phase 2: public pages`). Don't push secrets: `.env.local` stays in `.gitignore`.
- If something in the PRD is unclear, choose the simplest option, write it in `DECISIONS.md`, and continue.
