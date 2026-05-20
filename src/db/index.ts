import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';
import { seedBuiltinsIfNeeded } from './seed';

const DB_NAME = 'radarrank.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}

// Memoized so concurrent callers can't race the built-in seed check
// and double-insert. Safe to call from multiple components.
export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await getDb();
      await seedBuiltinsIfNeeded();
    })();
  }
  return initPromise;
}
