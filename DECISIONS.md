# Architecture & Implementation Decisions

## Phase 1.1
- **Brand color placeholder**: Using `#6D28D9` as the temporary brand color via CSS variables so the UI palette can be updated easily later once final fest branding is chosen.
- **Next.js 16 `proxy.ts`**: Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (exporting `proxy`). Used `proxy.ts` to follow Next.js 16 conventions cleanly without deprecation warnings.
- **`isLive` / `isUpNext` status handling**: Events marked `'done'` (as well as `'cancelled'`) return `false` from `isLive` and `isUpNext` so organisers clicking "Mark done" immediately remove an event from "Happening now" and "Up next".
- **Node types version**: Installed `@types/node@^24` (matching the local Node 24 runtime) so `vitest@5` installs cleanly without peer-dependency conflicts.
- **System font stack**: Removed build-time `next/font/google` fetch in favor of a system UI font stack for instant rendering on weak campus Wi-Fi, smaller page payloads, and reliable offline builds.

## Phase 2
- **Classic ISR (`revalidate = 30` / `15`)**: Disabled `cacheComponents` in `next.config.ts` so Next.js route-level ISR (`export const revalidate = 30`, `export const revalidate = 15`, `dynamicParams = true`) and `revalidatePath` work exactly as specified in `PROJECT_RULES.md` and `PRD.md`, with predictable edge caching and clear build output.

## Neon Night Kit Upgrade
- **Dark-only "Neon Night" theme**: Switched the design system to match `design/png/*.png` and `design/screens/*.html` (`#0B0A12` background, `#16141F` cards, `#2E2A3D` borders, `#C6FF3D` lime primary, `#FF4FA3` pink live accent, `Bricolage Grotesque` + `Inter`, inline SVG mascots with CSS animations disabled under `prefers-reduced-motion`).
- **Google Fonts via `<link>`**: Loaded `Bricolage Grotesque` and `Inter` via standard `<link rel="stylesheet">` with `display=swap` so production builds remain offline-safe while browsers get the exact design typography.
- **Incremental Supabase migration**: Created `supabase/migration_v2_upgrade.sql` so existing v1 Supabase databases can safely upgrade (`handle_new_user`, `handle_user_confirmed`, and `events.cover_url/host_name/host_coordinator`) before running `storage.sql`, `schema_participants.sql`, `schema_voting.sql`, and `schema_stamps.sql`.
- **Events route & `/schedule` redirect**: Added `/events` as the primary events directory per `APP_FLOW.md` and redirected `/schedule` → `/events` for backward compatibility.
