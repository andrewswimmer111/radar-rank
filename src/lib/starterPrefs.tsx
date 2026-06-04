import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getAppState, setAppState } from '@/db/appState';

const STATE_KEY = 'starter_prefs';

export type StarterTab = 'collections' | 'templates' | 'evaluations';

type Stored = {
  hidden?: string[];
  pinned?: string[];
  hiddenTabs?: StarterTab[];
};

type Prefs = {
  hidden: Set<string>;
  pinned: Set<string>;
  hiddenTabs: Set<StarterTab>;
};

type Ctx = Prefs & {
  hide: (id: string) => void;
  togglePinned: (id: string) => void;
  hideTab: (tab: StarterTab) => void;
  restoreHiddenItems: () => void;
  restoreHiddenTabs: () => void;
};

const PrefsContext = createContext<Ctx | null>(null);

function emptyPrefs(): Prefs {
  return { hidden: new Set(), pinned: new Set(), hiddenTabs: new Set() };
}

function removeFrom<T>(s: Set<T>, v: T): Set<T> {
  const next = new Set(s);
  next.delete(v);
  return next;
}

export function StarterPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(emptyPrefs);

  // One-shot load on mount. Failures are non-fatal — we just stay on the
  // empty default, and the next mutation will write a fresh blob.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getAppState(STATE_KEY);
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Stored;
        setPrefs({
          hidden: new Set(parsed.hidden ?? []),
          pinned: new Set(parsed.pinned ?? []),
          hiddenTabs: new Set(parsed.hiddenTabs ?? []),
        });
      } catch {
        // ignore — fall back to empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Prefs) => {
    const out: Stored = {
      hidden: Array.from(next.hidden),
      pinned: Array.from(next.pinned),
      hiddenTabs: Array.from(next.hiddenTabs),
    };
    setAppState(STATE_KEY, JSON.stringify(out)).catch(() => {});
  }, []);

  const update = useCallback(
    (mut: (cur: Prefs) => Prefs) => {
      setPrefs((cur) => {
        const next = mut(cur);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<Ctx>(
    () => ({
      hidden: prefs.hidden,
      pinned: prefs.pinned,
      hiddenTabs: prefs.hiddenTabs,
      hide: (id) =>
        update((cur) => ({
          ...cur,
          hidden: new Set(cur.hidden).add(id),
          pinned: removeFrom(cur.pinned, id),
        })),
      togglePinned: (id) =>
        update((cur) => {
          const next = new Set(cur.pinned);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { ...cur, pinned: next };
        }),
      hideTab: (tab) =>
        update((cur) => ({
          ...cur,
          hiddenTabs: new Set(cur.hiddenTabs).add(tab),
        })),
      restoreHiddenItems: () =>
        update((cur) => ({ ...cur, hidden: new Set() })),
      restoreHiddenTabs: () =>
        update((cur) => ({ ...cur, hiddenTabs: new Set() })),
    }),
    [prefs, update],
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function useStarterPrefs(): Ctx {
  const v = useContext(PrefsContext);
  if (!v) throw new Error('StarterPrefsProvider missing');
  return v;
}
