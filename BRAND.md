# Fiesta'26 brand for the app

Taken from the official Fiesta 2026 logo and banner (from the fest's Linktree), so the app looks like the fest's posters.

## Signals teaser
The Home screen carries a dashed purple "Signals · COMING SOON" card; it opens screen 51 (what Signals is, how it works, Notify me). The page background is true black (`#000000`) everywhere: no gradients, no glow, no blue tint. The Signals logo is `brand/signals-logo.svg`: a cyan dot with three arcs (yellow, pink, purple). See `SIGNALS_TEASER.md`.

## Name
- Fest: **Fiesta 2026** (short: **Fiesta'26**), "Intra College Cultural Fest", **SDMCET, Dharwad**, **25–27 Nov 2026**.
- App: **Fiesta'26 Live**.

## Assets (`brand/`)
| File | Use |
| --- | --- |
| `fiesta26-logo.png` | Official logo, transparent background. Home header, Welcome, QR posters, stage screen. Never stretch or recolour it; keep it on dark or purple backgrounds |
| `fiesta26-banner.jpg` | Official purple halftone banner with the logo. Default cover for events without a photo, share/Open Graph image |
| `icon-192.png`, `icon-512.png` | App icon (logo on Fiesta purple) for the web app manifest and "Add to Home Screen" |

Copy `brand/` into the Next.js `public/brand/` folder.

## Colours
| Token | Hex | Where |
| --- | --- | --- |
| `--fiesta-yellow` (accent) | `#FFD60A` | Primary buttons, active tab, highlights (matches "FIESTA" lettering) |
| `--fiesta-pink` | `#FF4FD8` | Hard shadows, live dots, lightning accents (matches the bolts) |
| `--fiesta-purple` | `#32194A` | Banner/header band with the pink halftone dots |
| `--bg` | `#000000` | Page background: true black, the same black as the Signals app |
| `--card` | `#1F1230` | Cards |
| `--line` | `#3B2758` | Borders |
| `--text` | `#F4F2FA` | Text |
| `--muted` | `#BDB8CF` | Secondary text |
| supporting | `#9B6CFF` violet, `#22D3EE` cyan, `#FF9F43` orange, `#FFE14D` warning yellow, `#FF4F5E` alert red | Categories and states |

Text on yellow, pink and cyan is always `#000000` (dark), never white.

**Halftone band** (header on Home, posters): `background-color: #32194A; background-image: radial-gradient(rgba(255,79,216,0.28) 1.3px, transparent 1.6px); background-size: 9px 9px;`

## Type
- **Bungee** (Google Fonts) for big page titles only (h1, 30 px and up). It's chunky and all-caps like the logo lettering.
- **Bricolage Grotesque** 800 for section headings and card titles.
- **Inter** for everything else.

## Style
- Comic/pop-art feel from the logo: thick outlines and hard offset shadows in pink or yellow (`box-shadow: 5px 5px 0 #FF4FD8`), slight rotations on stickers and tags.
- Mascots stay (they fit the pop style); animations off under reduced motion.


## Signals logo pack (`brand/signals/`)
The mark is a cyan dot sending out three signals (yellow inside, pink, purple outside). Source of truth: `signals-brand-sheet.png` (construction, colours, clear space, minimum size, backgrounds).
| File | Use |
| --- | --- |
| `signals-mark.svg` (+ `-white`, `-black`) | The mark alone, any size |
| `signals-logo-stacked.svg` (+ `-white`, `-black`) | Mark above the word SIGNALS: splash, posters |
| `signals-logo-horizontal.svg` (+ `-white`) | Mark left, word right: headers, email, slides |
| `signals-app-icon.svg` / `-maskable.svg` | App icon (rounded) and the full-bleed one for Android maskable and Apple |
| `png/` | Ready PNGs (transparent, and on black) of every logo |
| `icons/` | `signals-icon-1024/512/192.png`, `signals-icon-maskable-512/192.png`, `apple-touch-icon.png` (180), `favicon-48/32/16.png`, `favicon.ico` |
| `../signals-logo-120.png` | Square 120 px logo for Google's consent screen |
Letters are outlined from Bungee (no font needed). Use these icons for the PWA manifest and favicon when the app is in Signals (campus) mode; the Fiesta'26 icons (`brand/icon-192.png`, `icon-512.png`) are for the fest mode only.
