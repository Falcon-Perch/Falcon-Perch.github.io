# Falcon Perch

A privacy-first, mobile-first PWA that lets you choose the location the app uses (your **perch**) instead of your real GPS position. Built to be hosted free on GitHub Pages.

## What it does

- **Set a perch** by tapping the map, searching a place, or typing coordinates (`6.9271, 79.8612`, `6.92°N 79.86°E`).
- **Two modes**: *Always use my perch* (default; GPS is only read when you tap a GPS button and confirm) or *Ask me every time*.
- **Saved places**: save, rename, delete and switch perches in one tap.
- **Privacy log**: every location request, what answered it, and a 30-day count of real-location uses. Real coordinates are never logged.
- **Share** your perch as coordinates plus an OpenStreetMap link.
- **Your data**: export/import places as JSON, and "Forget everything" wipes IndexedDB, settings and cached tiles.
- **Installable and offline-capable**: app shell precached, and map tiles you've viewed are cached (capped, per OSM policy).

### What it can't do
A web app can't change your device's system GPS. Falcon Perch controls the location used *inside this app only*; other apps and sites are unaffected. This is shown in Settings.

## Tech stack

React 18 + TypeScript, Vite 6, Tailwind CSS 4, Zustand, Dexie (IndexedDB), Leaflet + react-leaflet with OpenStreetMap tiles, Nominatim search, vite-plugin-pwa (Workbox), Vitest. Fonts are self-hosted via Fontsource, so no requests go to Google.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/falcon-perch/
npm test
npm run build && npm run preview
```

Geolocation needs a secure context. `localhost` counts, but to test on a phone over your LAN you need HTTPS (or just test on the deployed Pages URL).

## Deploy to GitHub Pages

1. Create a repository named **`falcon-perch`** and push this project to `main`.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: install, test, build, deploy.
4. The site is served at `https://<your-username>.github.io/falcon-perch/`.

**Different repo name or custom domain?** Change `BASE` at the top of `vite.config.ts` (`'/<repo-name>/'`, or `'/'` for a custom domain plus a `public/CNAME` file).

## GitHub Pages specifics

| Constraint | How it's handled |
|---|---|
| Sub-path hosting | `BASE` drives Vite `base`, manifest `scope`/`start_url` and the service worker |
| No server rewrites | `HashRouter` (`/#/places`) so refreshes never 404 |
| No custom HTTP headers | CSP injected as a `<meta>` tag at build time (`cspMeta` plugin) |
| No backend | All data in IndexedDB/localStorage; backup via JSON export |

## Project structure

```
src/
  location/        locationManager (single entry point), real + perch providers
  db/              Dexie schema: places, log
  store/           Zustand: settings (persisted), ask dialog, toasts
  lib/             coordinate helpers, Nominatim search, export/import/forget
  components/      MapView, SearchBar, PerchCard, AskDialog, TabBar, UpdatePrompt
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
