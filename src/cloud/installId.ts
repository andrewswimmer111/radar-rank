import * as Crypto from 'expo-crypto';

import { getAppState, setAppState } from '../db/appState';

const INSTALL_ID_KEY = 'install_id';

let cached: string | null = null;

// Stable per-install identifier used as the `owner_install_id` on cloud rows.
// Survives app restarts; regenerates on reinstall (acceptable trade-off
// for v1 — no creator auth yet, cloud row ownership is best-effort).
export async function getOrCreateInstallId(): Promise<string> {
  if (cached) return cached;

  const existing = await getAppState(INSTALL_ID_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const id = Crypto.randomUUID();
  await setAppState(INSTALL_ID_KEY, id);
  cached = id;
  return id;
}
