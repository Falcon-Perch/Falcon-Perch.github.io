import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.falconperch',
  appName: 'Falcon Perch',
  // Built with `npm run build:android`, which uses relative asset paths and no service worker.
  webDir: 'dist',
  android: {
    // Nothing in the app needs plain-HTTP content.
    allowMixedContent: false,
  },
};

export default config;
