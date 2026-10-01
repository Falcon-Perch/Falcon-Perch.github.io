import { logRequest } from '../db/db';
import { useAsk } from '../store/ask';
import { useSettings } from '../store/settings';
import { perchProvider } from './perchProvider';
import { realProvider } from './realProvider';
import { LocationError, type Fix } from './types';

/**
 * The single entry point for location inside Falcon Perch.
 * No other module may call navigator.geolocation — that keeps every
 * request visible in the Privacy log and subject to the user's mode.
 */
export async function getLocation(purpose: string): Promise<Fix | null> {
  const { mode, perch } = useSettings.getState();
  const choice = mode === 'ask' ? await useAsk.getState().ask(purpose, !!perch) : 'perch';

  if (choice === 'cancel') {
    await logRequest(purpose, 'cancelled');
    return null;
  }
  if (choice === 'perch') {
    try {
      const fix = await perchProvider.getCurrent();
      await logRequest(purpose, 'perch');
      return fix;
    } catch {
      await logRequest(purpose, 'no-perch');
      return null;
    }
  }
  return readRealLocation(purpose);
}

/** Explicit "use my GPS once" — always confirmed by the user, whatever the mode. */
export async function requestRealLocation(purpose: string): Promise<Fix | null> {
  const choice = await useAsk.getState().ask(purpose, false, true);
  if (choice !== 'real') {
    await logRequest(purpose, 'cancelled');
    return null;
  }
  return readRealLocation(purpose);
}

async function readRealLocation(purpose: string): Promise<Fix | null> {
  try {
    const fix = await realProvider.getCurrent();
    await logRequest(purpose, 'real', fix.accuracy);
    return fix;
  } catch (err) {
    const kind = err instanceof LocationError ? err.kind : 'unavailable';
    await logRequest(purpose, kind);
    throw err;
  }
}
