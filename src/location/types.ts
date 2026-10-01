import type { LatLng } from '../lib/geo';

export type FixSource = 'perch' | 'real';

export interface Fix extends LatLng {
  source: FixSource;
  accuracy?: number;
  label?: string;
}

export interface LocationProvider {
  getCurrent(): Promise<Fix>;
}

export class LocationError extends Error {
  kind: 'denied' | 'unavailable';
  constructor(kind: 'denied' | 'unavailable', message: string) {
    super(message);
    this.kind = kind;
  }
}
