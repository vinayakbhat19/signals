# Project rules for the coding agent (Fest Live)

Read this file and `PRD.md` before every task. If a request conflicts with these rules, stop and ask.

## Stack (do not change without asking)
- Next.js (latest stable) with the **App Router**, **TypeScript strict**, Tailwind CSS, shadcn/ui.
- Supabase via `@supabase/ssr` and `@supabase/supabase-js`. No other backend, no ORM.
- Libraries allowed: `swr`, `zod`, `papaparse`, `qrcode`, `date-fns`, `date-fns-tz`, `lucide-react`, `@vercel/analytics`. Ask before adding anything else.
- Package manager: npm.

## Folder layout
```
app/                  routes (see PRD section 10)
  (public)/...        public pages
  admin/...           organiser pages
  api/live/route.ts   cached JSON for polling
components/           UI components (components/ui = shadcn)
lib/supabase/         server.ts (cookie client), public.ts (cookie-less anon client), admin.ts (service role, server only)
lib/data/             data-access functions (one file per table)
lib/time.ts           all date/time helpers (Asia/Kolkata)
lib/validation.ts     zod schemas
supabase/             schema.sql, seed.sql (already written; do not rewrite)
```

## Data and caching (most important for fest day)
1. **Public pages read data with the cookie-less anon client** (`lib/supabase/public.ts`), so Next.js can cache them. Never read cookies in public data functions.
2. Public pages use `export const revalidate = 30`. `/api/live` uses `revalidate = 15` and returns `{ now, next, announcements, serverTime }`.
3. Client components poll `/api/live` with SWR every 20 s (`refreshInterval: 20000`), never Supabase directly.
4. Every organiser write (server action) calls `revalidatePath` for the affected pages and `/api/live`, so changes appear immediately.
5. Signed-in features (stars, signals, admin) use the cookie client in `lib/supabase/server.ts` and are dynamic.

## Security
- Row Level Security is already defined in `supabase/schema.sql`. Do not disable it and do not rely on the UI alone: every server action checks the user and role again.
- **Never `select('*')` from `signals`.** List the columns. The `contact` column is not readable; get it with `supabase.rpc('get_signal_contact', { p_signal_id })`.
- After inserting into `signals` or `signal_responses`, select only `id` (`.select('id')`).
- `SUPABASE_SERVICE_ROLE_KEY` is used **only** in `lib/supabase/admin.ts`, only in server code (`import 'server-only'`), and only for "delete my account." Never prefix it with `NEXT_PUBLIC_`.
- Validate every form with zod on the server. Escape nothing by hand: render text as text, never `dangerouslySetInnerHTML`.
- Do not store or ask for phone numbers, Aadhaar, location or anything not in the PRD.

## Time
- All times are stored as `timestamptz` and shown in **Asia/Kolkata** via helpers in `lib/time.ts` (`formatTime`, `formatDay`, `isLive`, `toIstDate`). Never use the server's local time zone.
- "Now" on the client comes from `serverTime` in `/api/live` plus elapsed time, so wrong phone clocks don't break "Happening now."

## UI
- Mobile first: design at 390 px wide, then check 768 px and 1280 px.
- Bottom tab bar on mobile: Home, Schedule, Signals, My, More.
- Brand colour `#6D28D9` (placeholder — easily swappable later); category colours: tech blue, cultural pink, sports green, workshop orange, talk purple, fun yellow, official grey.
- Support light and dark mode (follow the system).
- Tap targets ≥ 44 px; text contrast WCAG AA; images use `next/image`.
- Every list has a loading skeleton and an empty state with a helpful sentence.
- Keep public pages light: no heavy animation libraries; JS under 200 KB gzip.

## Code quality
- Small components, typed props, no `any`.
- Data access only in `lib/data/*`; components never build queries.
- Errors: show a friendly message plus a retry button; log details with `console.error` on the server.
- Before saying a task is done: run `npm run lint`, `npm run build`, and check the feature in the browser at 390 px. Report what you checked.

## Working style
- Do one phase at a time. At the end of a phase: summarise what changed, list files, list what you tested, and list anything not done.
- Commit after each phase with a clear message (`phase 2: public pages`). Don't push secrets: `.env.local` stays in `.gitignore`.
- If something in the PRD is unclear, choose the simplest option, write it in `DECISIONS.md`, and continue.
