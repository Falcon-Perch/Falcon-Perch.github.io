import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * System-wide location for the Android app. The native side
 * (android/.../MockLocationService.java) publishes the perch to Android's GPS, network
 * and fused providers and to Google Play services, so every app (Google Maps included)
 * sees the perch. Only available in the Android build; the web app can't do this.
 */

export type PermissionStatus = 'granted' | 'denied' | 'prompt';

export interface SystemStatus {
  supported: boolean;
  sdk: number;
  developerOptions: boolean;
  mockAppSelected: boolean;
  locationPermission: PermissionStatus;
  notificationPermission: PermissionStatus;
  locationServicesOn: boolean;
  playServices: boolean;
  /** The user wants system-wide location on. */
  enabled: boolean;
  /** The service is publishing fixes right now. */
  running: boolean;
  /** Google Play services' fused provider is mocked (what Google Maps reads). */
  fusedActive: boolean;
  providers: string[];
  moving: boolean;
  lat?: number;
  lng?: number;
  label?: string;
  speed?: number;
  currentLat?: number;
  currentLng?: number;
  lastError?: 'NOT_MOCK_APP' | 'START_FAILED' | string;
}

export interface StartOptions {
  lat: number;
  lng: number;
  label?: string;
  /** Metres per second. 0 jumps straight there. */
  speed?: number;
  /** Reported accuracy in metres. */
  accuracy?: number;
  altitude?: number;
}

type Opened = { opened: string };

interface SystemLocationPlugin {
  getStatus(): Promise<SystemStatus>;
  start(options: StartOptions): Promise<SystemStatus>;
  stop(): Promise<SystemStatus>;
  openDeveloperSettings(): Promise<Opened>;
  openAppSettings(): Promise<Opened>;
  openLocationSettings(): Promise<Opened>;
  requestLocationPermission(): Promise<SystemStatus>;
  requestNotificationPermission(): Promise<SystemStatus>;
  addListener(event: 'statusChange', cb: (status: SystemStatus) => void): Promise<PluginListenerHandle>;
}

export const isAndroidApp = Capacitor.getPlatform() === 'android';

export const SystemLocation = registerPlugin<SystemLocationPlugin>('SystemLocation');

export type Travel = 'jump' | 'walk' | 'cycle' | 'drive';

/** Metres per second for each travel mode. */
export const travelSpeeds: Record<Travel, number> = { jump: 0, walk: 1.4, cycle: 5, drive: 14 };

/** Everything Android needs before system-wide location can start. */
export function isReady(s: SystemStatus | null): boolean {
  return !!s && s.developerOptions && s.mockAppSelected;
}

export function errorMessage(code: string | undefined): string {
  switch (code) {
    case 'NOT_MOCK_APP':
      return 'Android stopped system-wide location: Falcon Perch is no longer the mock location app. Pick it again in Developer options.';
    case 'START_FAILED':
      return 'Android wouldn’t keep system-wide location running in the background. Open Falcon Perch and turn it on again.';
    default:
      return code ? `System-wide location stopped: ${code}` : 'System-wide location stopped.';
  }
}

/** Where to download the Android app. Built by .github/workflows/android.yml. */
export const APK_URL = 'https://github.com/Falcon-Perch/Falcon-Perch.github.io/releases/download/android-latest/falcon-perch.apk';
