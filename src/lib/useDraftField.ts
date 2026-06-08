import { useEffect, useRef, useState } from 'react';

export type DraftOptions = {
  // Commit any pending edit on unmount. Covers back button, swipe-back,
  // hardware back — any pop path that destroys the screen before blur fires.
  commitOnUnmount?: boolean;
  // Allow empty drafts to be committed. Default false: trims whitespace and
  // reverts an empty draft to the saved value (treat as "no edit").
  allowEmpty?: boolean;
};

export type Draft = {
  value: string;
  setValue: (next: string) => void;
  commit: () => Promise<void>;
};

// Local text draft synced to a saved value and persisted via `commit`. Reverts
// empty edits unless `allowEmpty`. Single source for the "title input that
// saves on blur" pattern used by the collection, template, and evaluation
// editors — keeps unmount-safe commit consistent across all three.
export function useDraftField(
  saved: string | undefined,
  commit: (next: string) => Promise<void> | void,
  opts: DraftOptions = {},
): Draft {
  const { commitOnUnmount = false, allowEmpty = false } = opts;
  const [value, setValue] = useState(saved ?? '');

  useEffect(() => {
    setValue(saved ?? '');
  }, [saved]);

  // Mirror live state into refs so the unmount commit and stable `tryCommit`
  // can read the latest values without resubscribing on every keystroke.
  const valueRef = useRef(value);
  const savedRef = useRef(saved ?? '');
  const commitRef = useRef(commit);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { savedRef.current = saved ?? ''; }, [saved]);
  useEffect(() => { commitRef.current = commit; }, [commit]);

  const tryCommit = async () => {
    const current = valueRef.current;
    if (!allowEmpty) {
      const trimmed = current.trim();
      if (!trimmed) {
        setValue(savedRef.current);
        return;
      }
      if (trimmed === savedRef.current) return;
      await commitRef.current(trimmed);
      return;
    }
    if (current === savedRef.current) return;
    await commitRef.current(current);
  };

  useEffect(() => {
    if (!commitOnUnmount) return;
    return () => {
      const current = valueRef.current;
      if (!allowEmpty) {
        const trimmed = current.trim();
        if (!trimmed || trimmed === savedRef.current) return;
        void commitRef.current(trimmed);
        return;
      }
      if (current === savedRef.current) return;
      void commitRef.current(current);
    };
  }, [commitOnUnmount, allowEmpty]);

  return { value, setValue, commit: tryCommit };
}
