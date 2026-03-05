
import Dexie, { Table } from 'dexie';

export interface Short {
  id?: number;
  title: string;
  brainrotDelta: number;
  timestamp: number;
}

export class ShortsDB extends Dexie {
  shorts!: Table<Short>; 

  constructor() {
    super('shortsDatabase');
    this.version(1).stores({
      shorts: '++id, title, brainrotDelta, timestamp'
    });
  }
}

export const db = new ShortsDB();
