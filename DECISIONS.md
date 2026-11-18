# Dependency Decisions (`DECISIONS.md`)

Every direct dependency in `package.json` and why it is included:

| Package | Purpose |
| --- | --- |
| `next` | App Router framework, ISR/SSG edge caching, Server Actions, security headers |
| `react`, `react-dom` | UI runtime |
| `@supabase/supabase-js` | Typed Supabase Postgres, Auth, Storage, and RPC client |
| `@supabase/ssr` | Cookie-backed `httpOnly` PKCE sessions for App Router server components and `proxy.ts` |
| `zod` | Server-side schema validation for all server actions, API routes, and CSV imports |
| `swr` | Lightweight client polling for `/api/live` (20 s) and `/api/vote/[id]` (5 s) with hidden-tab pause |
| `lucide-react` | Tree-shakable SVG icon set |
| `qrcode` | Client & server QR data-URL generation for Stamp Stations, Vote screens, 2FA TOTP, and printable posters |
| `papaparse` | Browser-side CSV parsing for organiser schedule import and host participant import |
| `date-fns`, `date-fns-tz` | Explicit `Asia/Kolkata` (IST) date/time formatting and UTC conversion |
| `@base-ui/react`, `class-variance-authority`, `cn` | Accessible UI primitives and Tailwind v4 utility composition |
| `shadcn` (dev), `tw-animate-css` | Component scaffolding CLI (dev-only) and CSS animations |
| `sonner` | Toast notifications for forms, votes, and organiser actions |
| `next-themes` | Theme provider compatibility for shadcn components |
| `@vercel/analytics` | Cookie-free privacy-friendly pageview analytics |
| `server-only` | Compile-time guard preventing server secrets (`lib/supabase/admin.ts`, `lib/ratelimit.ts`, `lib/push.ts`, `lib/snapshot.ts`) from entering client bundles |
| `vitest` (dev) | Unit testing for IST time logic, CSV injection sanitisation, and upload signature checks |
