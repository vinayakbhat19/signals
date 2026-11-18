# Signals: coming soon (the teaser page)

The Home screen has a **Signals · COMING SOON** card. It opens one page that must make people curious about the campus app. The page is **pure black** (`#000000`, no glow, no blue tint) with the Fiesta accent colours, and it starts with an animation.

**Source of truth: `design/prototype/signals-coming-soon.html`** (open it in a phone browser, or a desktop browser at phone width; tap the logo to replay). It is plain HTML, CSS and a little JavaScript, no libraries. The coding agent ports it exactly into `/signals/` (Prompt SOON.1). Still frames are in `design/prototype/frames/`. The logo is `brand/signals-logo.svg`.

## 1. The opening animation (about 6 seconds)
The order is: letters, then the frame, then COMING SOON, then the logo.

| Time | What happens |
| --- | --- |
| 0.1 - 0.9 s | The letters **S I G N A L S** shoot in fast from both sides of the screen, spinning, and **collide** in the middle. A flash ring bursts out and the word shakes |
| 0.9 - 1.7 s | They bounce apart and **fall**, tumbling, and land scattered on the floor with a small bounce |
| 1.7 - 2.7 s | Each letter hops back and **joins** its place, snapping together into the word SIGNALS |
| 2.95 s | A yellow **frame** wipes around the word and snaps shut (pink shadow) |
| 3.45 s | **COMING SOON** is stamped on below, like a sticker, with a little shake |
| 4.0 - 5.2 s | The **logo is built** above the word: the cyan dot pops, then three arcs are drawn one by one (yellow, pink, purple) |
| 5.4 s onward | Rings ripple out from the logo like a signal being broadcast, and the arcs gently pulse |
| 5.5 s | "Something on campus is about to light up." fades in |
| 6.0 s | A **down arrow** (arrow only, no word) bounces at the bottom |
| every 8 s | The letters do a small wave of hops. Tapping a letter makes it hop. Tapping the logo replays the whole opening |

Rules: pure CSS keyframes (works without JavaScript). With **reduced motion** on, everything is shown still. The page never scrolls sideways. After the first screen a small yellow **Notify me** pill appears at the top while scrolling. The next section starts right below the arrow: no big empty gap.

## 2. What the person reads when they scroll
1. **What is Signals?** "Your campus. Your people. No phone numbers." Signals is a place only for people on our campus. Raise a Signal to find the people you need; start a community, make a friend group, run a meme page that only we can see; post anything, join anything, without ever handing out your number.
2. **Raise a Signal** (the main feature): "Need someone? Raise a Signal." Four rows: **Builders for your idea** / **Teammates for any event** (hackathon, dance, quiz, sports, a fest contest) / **Clubs finding their team** (members, volunteers, a crew) / **Communities to join**. Then **three example Signals** (a hackathon teammate, a dance club recruiting for its fest team, a canteen-app builder search), each with an "I'm in" button and an "interested" number that counts up as it scrolls into view, and the line "Nobody sees your phone number. You only talk after the poster accepts you."
3. **Make it yours**, four cards: Start a community / Friend groups / Meme pages / Post anything.
4. **How it works**: 1 Raise a Signal, 2 People join in, 3 Connect, privately.
5. **Notify me when it opens** (big button).
6. **The developer, as one small card**: VB, DEVELOPER, **Vinayak Bhat**, vinayakkbhatt@gmail.com (a mail button opens the mail app), and "Got an idea or want to help build it? Write to me."

There is **no countdown and no launch date** on this page: the launch has not been decided, so the page only says "coming soon".

## 3. Rules for the real app
- Static page at `/signals/` (no server). Fonts: Bungee, Bricolage Grotesque, Inter as in `BRAND.md`.
- **Notify me**: signed-in users subscribe the device to the push topic `signals` with `rpc('save_push_subscription', { p_topics: ['signals'] })` (see `PERMISSIONS_NOTIFICATIONS.md`) and can switch it off. Signed-out users are asked to sign in first. The prototype only stores the choice in localStorage.
- The email address is only text and a `mailto:` link; nothing is collected on this page.
- Keep the page light: no images except inline SVG; under 100 KB without fonts.
- Keep the order: the opening, then what it is, then how it works, then Notify me, then the developer card.

## 4. Things the copy promises that still need to be built (read before launching Signals)
The teaser describes the vision. Today the database has **Signals posts with "I'm in" and accept** (four types). It does **not** yet have **communities, friend groups or meme pages**, and **clubs recruiting members** is only a Signal type (a new "club team" type would need adding to the database), so those need their own design and tables before Signals opens.
"Only people on our campus" needs a way to know who is on campus. The fest setup has **no college email domain and no ID check**, so for Signals you need to decide how to check (for example a college email later, an ID check, or a roster list) before using that line.
