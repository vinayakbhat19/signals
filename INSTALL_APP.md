# "Add to Home Screen" button

**Android Chrome (and desktop Chrome/Edge): yes, we can trigger the install prompt from our own button.** **iPhone Safari: no, Apple does not allow it**; the app can only show the steps (Share → Add to Home Screen).

| Browser | What the button does |
| --- | --- |
| Android Chrome, Edge, Samsung Internet (when the browser offers it) | Opens the browser's real install dialog (`beforeinstallprompt` → `prompt()`) |
| iPhone / iPad Safari (and Chrome on iPhone) | Opens our sheet with the 3 steps and an arrow pointing down to the Share button. Push alerts on iPhone only work after the app is installed to the Home Screen |
| Instagram / WhatsApp / Facebook and other in-app browsers | They cannot install. The button shows "Open in Chrome or Safari, then tap Add to Home Screen" |
| Already installed (`display-mode: standalone`) | The button is hidden |

## What the site needs (all are in the working example `deploy-now/`)
1. **HTTPS** (Cloudflare Pages gives it).
2. **`/manifest.webmanifest`** with `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color`/`background_color` `#000000`, and icons 192 and 512 (purpose `any`) plus maskable 192 and 512. Linked with `<link rel="manifest" href="/manifest.webmanifest">`.
3. **A service worker** (`/sw.js`, registered on load). It also lets the home page open offline.
4. iPhone extras: `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` (180 px, no rounded corners), `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`.
5. The code in the page (copy it from `deploy-now/index.html`, section "Add to Home Screen"):
```js
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
window.addEventListener('appinstalled', () => { deferred = null; /* hide the button */ });
installButton.onclick = () => {
  if (deferred) { deferred.prompt(); deferred.userChoice.then(() => deferred = null); }
  else if (isIOS) openSheet(iosSteps);      // Share -> Add to Home Screen
  else openSheet(genericSteps);             // browser menu -> Install app
};
```
`prompt()` only works inside a tap (a click handler). The browser decides when `beforeinstallprompt` fires: not if the app is already installed, or if the person dismissed it recently. That is why the button always falls back to the steps.

## For the real app
Use the **Fiesta'26 icons** (`brand/icon-192.png`, `icon-512.png`) and the name "Fiesta'26 Live" for the fest, and the **Signals icons** (`brand/signals/icons/`) after the fest. Prompt A.2 builds the install bar and the sheet (screens 06 and 10); give it this file and the working example. The installed app's name and icon come from the manifest at the moment of installing.

## The intro and installing
The intro (`design/prototype/fiesta-intro.html`, Prompt INTRO.1) plays on every fresh launch: reopening the page after it was closed, opening the installed Home Screen app, and the first launch after the app's data was cleared. It never plays on a refresh. It uses sessionStorage, which is cleared when the tab or the installed app is closed.
