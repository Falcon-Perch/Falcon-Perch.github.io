import Dexie, { type Table } from 'dexie';

export interface Place {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  createdAt: number;
  lastUsedAt?: number;
}

export type LogSource = 'perch' | 'real' | 'denied' | 'unavailable' | 'cancelled' | 'no-perch';

export interface LogEntry {
  id?: number;
  at: number;
  purpose: string;
  source: LogSource;
  /** Accuracy in metres for real fixes. Real coordinates are never written to the log. */
  accuracy?: number;
}

class FalconPerchDB extends Dexie {
  places!: Table<Place, number>;
  log!: Table<LogEntry, number>;

  constructor() {
    super('falcon-perch');
    this.version(1).stores({
      places: '++id, name, createdAt, lastUsedAt',
      log: '++id, at, source',
    });
  }
}

export const db = new FalconPerchDB();

export async function logRequest(purpose: string, source: LogSource, accuracy?: number) {
  await db.log.add({ at: Date.now(), purpose, source, accuracy });
}
