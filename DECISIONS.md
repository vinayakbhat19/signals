# Architecture & Implementation Decisions

## Phase 1.1
- **Brand color placeholder**: Using `#6D28D9` as the temporary brand color via CSS variables so the UI palette can be updated easily later once final fest branding is chosen.
- **Next.js 16 `proxy.ts`**: Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (exporting `proxy`). Used `proxy.ts` to follow Next.js 16 conventions cleanly without deprecation warnings.
- **`isLive` / `isUpNext` status handling**: Events marked `'done'` (as well as `'cancelled'`) return `false` from `isLive` and `isUpNext` so organisers clicking "Mark done" immediately remove an event from "Happening now" and "Up next".
- **Node types version**: Installed `@types/node@^24` (matching the local Node 24 runtime) so `vitest@5` installs cleanly without peer-dependency conflicts.
- **System font stack**: Removed build-time `next/font/google` fetch in favor of a system UI font stack for instant rendering on weak campus Wi-Fi, smaller page payloads, and reliable offline builds.

## Phase 2
- **Classic ISR (`revalidate = 30` / `15`)**: Disabled `cacheComponents` in `next.config.ts` so Next.js route-level ISR (`export const revalidate = 30`, `export const revalidate = 15`, `dynamicParams = true`) and `revalidatePath` work exactly as specified in `PROJECT_RULES.md` and `PRD.md`, with predictable edge caching and clear build output.
