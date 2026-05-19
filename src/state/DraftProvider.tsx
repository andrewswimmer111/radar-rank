import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

import { defaultScoresFor, getTemplate } from '@/data/templates';
import type { Scores } from '@/data/types';

export type Draft = {
  templateId: string;
  name: string;
  scores: Scores;
};

type State = Draft | null;

type Action =
  | { type: 'LOAD_TEMPLATE'; templateId: string }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_SCORE'; key: string; value: number }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_TEMPLATE': {
      const template = getTemplate(action.templateId);
      if (!template) return state;
      return {
        templateId: action.templateId,
        name: '',
        scores: defaultScoresFor(template),
      };
    }
    case 'SET_NAME':
      if (!state) return state;
      return { ...state, name: action.name };
    case 'SET_SCORE':
      if (!state) return state;
      return { ...state, scores: { ...state.scores, [action.key]: action.value } };
    case 'RESET':
      return null;
  }
}

type DraftContextValue = {
  draft: Draft | null;
  loadTemplate: (templateId: string) => void;
  setName: (name: string) => void;
  setScore: (key: string, value: number) => void;
  reset: () => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, dispatch] = useReducer(reducer, null);

  const loadTemplate = useCallback((templateId: string) => {
    dispatch({ type: 'LOAD_TEMPLATE', templateId });
  }, []);
  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', name });
  }, []);
  const setScore = useCallback((key: string, value: number) => {
    dispatch({ type: 'SET_SCORE', key, value });
  }, []);
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value = useMemo(
    () => ({ draft, loadTemplate, setName, setScore, reset }),
    [draft, loadTemplate, setName, setScore, reset],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside <DraftProvider>');
  return ctx;
}
