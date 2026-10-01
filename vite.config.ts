import pkg from './package.json';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// The landing page (site/) is served at the root of falcon-perch.github.io and the web app
// under /app/. Change this if you host the app somewhere else.
const PAGES_BASE = '/app/';

// GitHub Pages can't send HTTP headers, so the Content Security Policy is a <meta> tag.
// It is only added to production builds because Vite's dev server needs inline scripts.
const csp = (native: boolean) => [
  "default-src 'self'",
  // Capacitor injects its bridge into index.html as an inline script in the Android app.
  native ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Leaflet positions tiles with inline styles
  "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self' https://nominatim.openstreetmap.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspMeta(native: boolean): Plugin {
  return {
      name: 'csp-meta',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp(native)}" />`),
  };
}

// `vite build --mode android` builds the web assets bundled into the Android app
// (see capacitor.config.ts): relative paths, and no service worker since the app is offline already.
export default defineConfig(({ mode }) => {
  const native = mode === 'android';
  const BASE = native ? './' : PAGES_BASE;
  return {
    base: BASE,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [
      react(),
      tailwindcss(),
      cspMeta(native),
      VitePWA({
        disable: native,
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Falcon Perch',
          short_name: 'Falcon Perch',
          description: 'Choose the location this app uses. Your real location stays private unless you share it.',
          theme_color: '#17222B',
          background_color: '#E6ECF0',
          display: 'standalone',
          orientation: 'portrait',
          scope: BASE,
          start_url: BASE,
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: `${BASE}index.html`,
          runtimeCaching: [
            {
              // Only tiles the user has already looked at are cached (OSM forbids bulk downloading).
              urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    test: { environment: 'node' },
  };
});
