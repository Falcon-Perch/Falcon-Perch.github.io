# Falcon Perch

A privacy-first, mobile-first app that lets you choose the location you appear at (your **perch**) instead of your real GPS position. It ships as a PWA hosted free on GitHub Pages and as an **Android app that replaces your location for every app on the phone**, Google Maps included.

## What it does

- **Set a perch** by tapping the map, searching a place, or typing coordinates (`6.9271, 79.8612`, `6.92°N 79.86°E`).
- **Two modes**: *Always use my perch* (default; GPS is only read when you tap a GPS button and confirm) or *Ask me every time*.
- **Saved places**: save, rename, delete and switch perches in one tap.
- **Privacy log**: every location request, what answered it, and a 30-day count of real-location uses. Real coordinates are never logged.
- **Share** your perch as coordinates plus an OpenStreetMap link.
- **Your data**: export/import places as JSON, and "Forget everything" wipes IndexedDB, settings and cached tiles.
- **Installable and offline-capable**: app shell precached, and map tiles you've viewed are cached (capped, per OSM policy).

### System-wide location (Android app)

The Android app adds **Apply my perch to all apps**. While it's on, every app on the phone sees your perch instead of your real location:

- **Android's own providers** (`gps`, `network`, and `fused` on Android 12+) are replaced with test providers, so apps using `LocationManager` get the perch.
- **Google Play services' fused location**, which Google Maps and most modern apps use, is put into mock mode. Without this, Play services would keep locating you from Wi‑Fi and cell towers.
- A fix is published every second by a foreground service, so apps never fall back to the real GPS. A quiet notification shows while it's on, with a **Stop** button.
- **Travel modes** (jump, walk, cycle, drive) move you smoothly to a new perch instead of jumping.
- If Android withdraws permission, or you tap Stop, the app switches itself off and tells you, so it never fails silently.

One-time setup on the phone (the app's Settings walks you through it and checks each step):

1. Install `falcon-perch.apk` from the [android-latest release](https://github.com/Falcon-Perch/Falcon-Perch.github.io/releases/tag/android-latest).
2. **Settings → About phone → tap Build number 7 times** to unlock Developer options.
3. **Developer options → Select mock location app → Falcon Perch.**
4. Allow location access when asked. It's needed to override Google Play services. Falcon Perch never stores or sends your real location.

**What it can't hide.** Your IP address (use a VPN), your mobile carrier's view of which towers you use, and data already in your Google account (pause Timeline). Android marks replaced locations, so some apps can detect it and may refuse to work. Turn it off before calling emergency services.

### What the web version can't do
A website can't change your device's system GPS. In the browser, Falcon Perch controls the location used *inside this app only*; other apps and sites are unaffected. Settings links to the Android app. **iPhone:** Apple doesn't let apps change the location other apps see, so system-wide location isn't possible on iOS.

## Tech stack

React 18 + TypeScript, Vite 6, Capacitor 7 (Android shell plus a native Java plugin), Tailwind CSS 4, Zustand, Dexie (IndexedDB), Leaflet + react-leaflet with OpenStreetMap tiles, Nominatim search, vite-plugin-pwa (Workbox), Vitest. Fonts are self-hosted via Fontsource, so no requests go to Google.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/app/
npm test
npm run build && npm run preview
```

### Android app

Needs Node 20+, JDK 21 and the Android SDK (Android Studio installs it).

```bash
npm run build:android                 # web build for the app + cap sync
cd android && ./gradlew assembleDebug  # → android/app/build/outputs/apk/debug/app-debug.apk
```

Or open the `android/` folder in Android Studio and press Run. CI builds the APK on every push (`.github/workflows/android.yml`) and, on `main`, publishes it to the `android-latest` release. Add the `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` repository secrets to sign release builds with your own key, so each new build installs as an update.

Geolocation needs a secure context. `localhost` counts, but to test on a phone over your LAN you need HTTPS (or just test on the deployed Pages URL).

## Deploy to GitHub Pages

The site at `https://falcon-perch.github.io/` has two parts:

- `/`: the landing page in `site/` (plain HTML, CSS and JS, no build step), with the download link and an animated walkthrough.
- `/app/`: the web app, built by Vite.

1. Push this project to `main` of the `Falcon-Perch.github.io` repository.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: install, test, build, copy `site/` to the root and the app to `/app/`, deploy.

**Hosting the app somewhere else?** Change `PAGES_BASE` at the top of `vite.config.ts`.

To preview the full site locally: `npm run build && rm -rf _site && mkdir _site && cp -r site/. _site/ && cp -r dist _site/app && npx serve _site`.

## GitHub Pages specifics

| Constraint | How it's handled |
|---|---|
| Sub-path hosting | `PAGES_BASE` (`/app/`) drives Vite `base`, manifest `scope`/`start_url` and the service worker |
| No server rewrites | `HashRouter` (`/#/places`) so refreshes never 404 |
| No custom HTTP headers | CSP injected as a `<meta>` tag at build time (`cspMeta` plugin) |
| No backend | All data in IndexedDB/localStorage; backup via JSON export |

## Project structure

```
site/              Landing page served at the site root (index.html, styles.css, main.js)
android/           Capacitor Android project
  app/src/main/java/io/github/falconperch/
    MockLocationService.java   foreground service that publishes the perch to the system
    SystemLocationPlugin.java  JS bridge: status, start/stop, setup shortcuts, permissions
src/
  location/        locationManager (single entry point), real + perch providers, systemLocation bridge
  db/              Dexie schema: places, log
  store/           Zustand: settings (persisted), ask dialog, toasts
  lib/             coordinate helpers, Nominatim search, export/import/forget
  components/      MapView, SearchBar, PerchCard, AskDialog, TabBar, UpdatePrompt, SystemWide, SystemSync
  pages/           Map, Places, Log, Settings
tests/             Vitest unit tests (geo helpers, locationManager rules)
```

**Rule:** nothing outside `src/location/realProvider.ts` may call `navigator.geolocation`. Features call `getLocation(purpose)` from `locationManager`, which applies the user's mode and writes the privacy log.

## Third-party services

- Map tiles: `tile.openstreetmap.org`. See the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). For heavier traffic, switch the `TileLayer` URL and the CSP to a provider such as MapTiler or Stadia.
- Search: Nominatim, max 1 request/second (enforced in `lib/search.ts`), submit-on-enter only.

## Next steps (roadmap)

- Playwright e2e tests at mobile viewports in CI
- Passphrase-encrypted export (Web Crypto)
- Low-data mode and an optional static-map fallback
- Lighthouse budget check in CI

## License

MIT
