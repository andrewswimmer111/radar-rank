'use client';

import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from 'obscenity';
import { useEffect, useMemo, useState } from 'react';

import { withVoteToken } from '@/lib/supabase';

import { ErrorState } from './ErrorState';
import styles from './styles.module.css';

// Built once at module scope — the matcher pre-compiles a large regex set
// from the english dataset + leetspeak transformers (1→i, 0→o, @→a,
// repeated chars collapsed, etc.), so it should not be rebuilt per render.
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// How often to recheck the cloud row for a fresh frozen_at while a
// voter has the form open. 15s is a comfortable trade-off — quick
// enough that a freeze rarely lets a voter fill in much before they
// notice, slow enough to not look like polling spam in network logs.
const FROZEN_POLL_MS = 15_000;

type SharedEvaluation = {
  id: string;
  title: string;
  accent_start: string;
  accent_end: string;
  accent_glow: string;
};

type SharedParticipant = {
  local_id: string;
  name: string;
  color: string | null;
};

type SharedCategory = {
  key: string;
  label: string;
  hint: string | null;
};

type Props = {
  voteToken: string;
  evaluation: SharedEvaluation;
  participants: SharedParticipant[];
  categories: SharedCategory[];
};

type ScoreMap = Record<string, Record<string, number>>;

const initialScores = (
  participants: SharedParticipant[],
  categories: SharedCategory[],
): ScoreMap => {
  const out: ScoreMap = {};
  for (const p of participants) {
    out[p.local_id] = {};
    for (const c of categories) {
      out[p.local_id][c.key] = 50;
    }
  }
  return out;
};

export function VoteForm({
  voteToken,
  evaluation,
  participants,
  categories,
}: Props) {
  const [voterName, setVoterName] = useState('');
  const [scores, setScores] = useState<ScoreMap>(() =>
    initialScores(participants, categories),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Submission catches the cloud-side "frozen" rejection separately so the
  // whole form swaps to the frozen state, matching what a fresh page load
  // against a frozen link would render.
  const [frozen, setFrozen] = useState(false);

  // Poll for a freeze that happens while this voter has the form open.
  // The SSR check in page.tsx already covers visit-time, so this only
  // matters for the "filled out the form, creator paused mid-way" path.
  // Skips polling once frozen / submitted to avoid burning requests on
  // a page that's about to swap states.
  useEffect(() => {
    if (frozen || submitted) return;
    let cancelled = false;
    const sb = withVoteToken(voteToken);
    const check = async () => {
      const { data } = await sb
        .from('shared_evaluations')
        .select('frozen_at')
        .eq('id', evaluation.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.frozen_at) setFrozen(true);
    };
    const interval = setInterval(check, FROZEN_POLL_MS);
    // Re-check immediately when the tab regains focus — a voter who
    // came back after an hour shouldn't have to wait a full poll
    // cycle to learn the link is paused.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [voteToken, evaluation.id, frozen, submitted]);

  const gradient = useMemo(
    () =>
      `linear-gradient(135deg, ${evaluation.accent_start}, ${evaluation.accent_end})`,
    [evaluation.accent_start, evaluation.accent_end],
  );

  const trimmedName = voterName.trim();
  // Only run the matcher once the user has committed to a name — no red
  // flash while they're mid-typing. Empty string skips the check.
  const nameHasProfanity = useMemo(
    () => trimmedName.length > 0 && profanityMatcher.hasMatch(trimmedName),
    [trimmedName],
  );
  const canSubmit = trimmedName.length > 0 && !nameHasProfanity && !submitting;

  const onChangeScore = (
    participantId: string,
    categoryKey: string,
    value: number,
  ) => {
    setScores((prev) => ({
      ...prev,
      [participantId]: { ...prev[participantId], [categoryKey]: value },
    }));
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    const flat: {
      participant_local_id: string;
      category_key: string;
      value: number;
    }[] = [];
    for (const p of participants) {
      for (const c of categories) {
        flat.push({
          participant_local_id: p.local_id,
          category_key: c.key,
          value: scores[p.local_id][c.key],
        });
      }
    }

    try {
      const sb = withVoteToken(voteToken);
      const { error } = await sb.rpc('submit_vote', {
        p_voter_name: voterName.trim(),
        p_scores: flat,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      // submit_vote raises 'evaluation_frozen' when the creator has
      // paused voting between page load and submit. Treat it like a
      // fresh frozen-link load rather than an inline retryable error.
      const raw =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
      if (raw.includes('evaluation_frozen')) {
        setFrozen(true);
        return;
      }
      setSubmitError(raw || 'Could not submit your scores. Please try again.');
      setSubmitting(false);
    }
  };

  if (frozen) {
    return <ErrorState variant="frozen" />;
  }

  if (submitted) {
    return (
      <main className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successBadge} style={{ background: gradient }} />
          <h1 className={styles.successTitle}>Thanks for voting</h1>
          <p className={styles.successBody}>
            Your scores were submitted. You can close this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.accentBar} style={{ background: gradient }} />
        <p className={styles.eyebrow}>RadarRank · Vote</p>
        <h1 className={styles.title}>{evaluation.title}</h1>
        <p className={styles.subtitle}>
          Score each participant on each category. 0 = lowest, 100 = highest.
        </p>
      </header>

      {submitError && (
        <div className={styles.errorBanner} role="alert">
          {submitError}
        </div>
      )}

      <section className={styles.nameSection}>
        <label className={styles.label} htmlFor="voter-name">
          Your name
        </label>
        <input
          id="voter-name"
          className={styles.input}
          value={voterName}
          onChange={(e) => setVoterName(e.target.value)}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="words"
          placeholder="So the creator knows who voted"
          aria-invalid={nameHasProfanity || undefined}
        />
        {nameHasProfanity && (
          <p className={styles.fieldError} role="alert">
            Please pick a different name.
          </p>
        )}
      </section>

      <section className={styles.participants}>
        {participants.map((p) => (
          <ParticipantCard
            key={p.local_id}
            participant={p}
            categories={categories}
            scores={scores[p.local_id] ?? {}}
            onChangeScore={(catKey, val) => onChangeScore(p.local_id, catKey, val)}
          />
        ))}
      </section>

      <div className={styles.submitWrap}>
        <button
          type="button"
          className={styles.submitBtn}
          disabled={!canSubmit}
          onClick={onSubmit}
          style={canSubmit ? { background: gradient } : undefined}>
          {submitting ? 'Submitting…' : 'Submit scores'}
        </button>
      </div>
    </main>
  );
}

function ParticipantCard({
  participant,
  categories,
  scores,
  onChangeScore,
}: {
  participant: SharedParticipant;
  categories: SharedCategory[];
  scores: Record<string, number>;
  onChangeScore: (categoryKey: string, value: number) => void;
}) {
  const initial = participant.name.charAt(0).toUpperCase();
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div
          className={styles.colorChip}
          style={{
            background: participant.color ?? 'var(--bg-elev-2)',
          }}>
          <span className={styles.colorChipText}>{initial}</span>
        </div>
        <h2 className={styles.cardTitle}>{participant.name}</h2>
      </header>
      <div className={styles.sliderList}>
        {categories.map((c) => {
          const value = scores[c.key] ?? 50;
          return (
            <div key={c.key} className={styles.sliderRow}>
              <div className={styles.sliderRowHead}>
                <span className={styles.sliderLabel}>{c.label}</span>
                <span className={styles.sliderValue}>{value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(e) => onChangeScore(c.key, Number(e.target.value))}
                className={styles.slider}
                aria-label={`${participant.name} – ${c.label}`}
              />
              {c.hint && <p className={styles.sliderHint}>{c.hint}</p>}
            </div>
          );
        })}
      </div>
    </article>
  );
}
