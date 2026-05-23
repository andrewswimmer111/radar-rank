import type { Scores, Template } from '@/data/types';

export type TraitSummary = {
  key: string;
  label: string;
  score: number;
};

export function scoredCategories(
  template: Template,
  scores: Scores,
): TraitSummary[] {
  return template.categories.map((c) => ({
    key: c.key,
    label: c.label,
    score: Math.round(scores[c.key] ?? 50),
  }));
}

export function topTrait(template: Template, scores: Scores): TraitSummary {
  return scoredCategories(template, scores).reduce((best, cur) =>
    cur.score > best.score ? cur : best,
  );
}

export function lowestTrait(template: Template, scores: Scores): TraitSummary {
  return scoredCategories(template, scores).reduce((worst, cur) =>
    cur.score < worst.score ? cur : worst,
  );
}

export function overallScore(template: Template, scores: Scores): number {
  const items = scoredCategories(template, scores);
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, c) => acc + c.score, 0);
  return Math.round(sum / items.length);
}

// Scouting-style grade ladder. Tuned so 50 ≈ C, 80 ≈ A, 95+ ≈ S.
export function gradeFromScore(score: number): string {
  if (score >= 96) return 'S+';
  if (score >= 92) return 'S';
  if (score >= 88) return 'A+';
  if (score >= 83) return 'A';
  if (score >= 78) return 'A-';
  if (score >= 73) return 'B+';
  if (score >= 68) return 'B';
  if (score >= 63) return 'B-';
  if (score >= 56) return 'C+';
  if (score >= 48) return 'C';
  if (score >= 40) return 'C-';
  if (score >= 32) return 'D+';
  if (score >= 24) return 'D';
  if (score >= 16) return 'D-';
  return 'F';
}

// Coarse archetype derived from average + spread. Used as the small
// "profile type" eyebrow on the card.
export function profileArchetype(template: Template, scores: Scores): string {
  const items = scoredCategories(template, scores);
  if (items.length === 0) return 'Profile';
  const vals = items.map((i) => i.score);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const spread = Math.max(...vals) - Math.min(...vals);
  if (avg >= 82) return 'Elite Profile';
  if (spread >= 40) return 'Specialist Profile';
  if (spread >= 22) return 'Versatile Profile';
  return 'Balanced Profile';
}

// ---- Evaluation-level aggregates (flat Score[] inputs) -------------------

type FlatScore = {
  participantId: string;
  categoryKey: string;
  value: number;
};

// Collapse a flat Score[] across all participants into a per-participant
// OVR map. Only scores whose categoryKey is in `categoryKeys` are counted
// — orphan scores (e.g., from a removed category) are ignored.
export function ovrByParticipant(
  scores: readonly FlatScore[],
  categoryKeys: readonly string[],
): Map<string, number> {
  const allowed = new Set(categoryKeys);
  const buckets = new Map<string, number[]>();
  for (const s of scores) {
    if (!allowed.has(s.categoryKey)) continue;
    let list = buckets.get(s.participantId);
    if (!list) {
      list = [];
      buckets.set(s.participantId, list);
    }
    list.push(s.value);
  }
  const out = new Map<string, number>();
  for (const [pid, vals] of buckets) {
    if (vals.length === 0) continue;
    out.set(pid, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
  }
  return out;
}

// 1-indexed rank of `value` within `peers` (higher value = better rank).
// Ties resolve to the same rank (competition ranking).
export function rankAmong(value: number, peers: readonly number[]): number {
  let above = 0;
  for (const p of peers) if (p > value) above++;
  return above + 1;
}

// Percentile (0–100) of `value` within `peers` using the "less-than-or-
// equal" definition: top score = 100th, bottom = 100/N. Peers may
// include `value` itself.
export function percentileAmong(
  value: number,
  peers: readonly number[],
): number {
  if (peers.length === 0) return 0;
  let leOrEq = 0;
  for (const p of peers) if (p <= value) leOrEq++;
  return Math.round((leOrEq / peers.length) * 100);
}

// Per-category mean across the given participants. Orphan categories
// (not in `categoryKeys`) and participants outside `participantIds`
// are ignored. Categories with zero contributing scores are omitted.
export function categoryMeans(
  scores: readonly FlatScore[],
  categoryKeys: readonly string[],
  participantIds: readonly string[],
): Map<string, number> {
  const allowedCats = new Set(categoryKeys);
  const allowedPs = new Set(participantIds);
  const sums = new Map<string, { sum: number; n: number }>();
  for (const s of scores) {
    if (!allowedCats.has(s.categoryKey)) continue;
    if (!allowedPs.has(s.participantId)) continue;
    const e = sums.get(s.categoryKey);
    if (e) {
      e.sum += s.value;
      e.n += 1;
    } else {
      sums.set(s.categoryKey, { sum: s.value, n: 1 });
    }
  }
  const out = new Map<string, number>();
  for (const [k, v] of sums) out.set(k, v.sum / v.n);
  return out;
}

export type CategorySummary = { key: string; label: string; mean: number };

// Strongest = highest mean across categories that have scores. `categories`
// supplies the label and the canonical order used to break ties (earlier
// category wins).
export function strongestCategoryByMean(
  means: Map<string, number>,
  categories: readonly { key: string; label: string }[],
): CategorySummary | null {
  let best: CategorySummary | null = null;
  for (const c of categories) {
    const m = means.get(c.key);
    if (m === undefined) continue;
    if (best === null || m > best.mean) {
      best = { key: c.key, label: c.label, mean: m };
    }
  }
  return best;
}

export function weakestCategoryByMean(
  means: Map<string, number>,
  categories: readonly { key: string; label: string }[],
): CategorySummary | null {
  let worst: CategorySummary | null = null;
  for (const c of categories) {
    const m = means.get(c.key);
    if (m === undefined) continue;
    if (worst === null || m < worst.mean) {
      worst = { key: c.key, label: c.label, mean: m };
    }
  }
  return worst;
}

// Range (max − min) of a single participant's own scores across the
// allowed categories. Mirrors the spread heuristic in `profileArchetype`.
// Returns null when they have no scores in any allowed category.
export function participantSpread(
  scores: readonly FlatScore[],
  participantId: string,
  categoryKeys: readonly string[],
): number | null {
  const allowed = new Set(categoryKeys);
  let min = Infinity;
  let max = -Infinity;
  for (const s of scores) {
    if (s.participantId !== participantId) continue;
    if (!allowed.has(s.categoryKey)) continue;
    if (s.value < min) min = s.value;
    if (s.value > max) max = s.value;
  }
  if (min === Infinity) return null;
  return max - min;
}

// Spread per participant. Participants with no scores in any allowed
// category are omitted.
export function spreadByParticipant(
  scores: readonly FlatScore[],
  categoryKeys: readonly string[],
): Map<string, number> {
  const allowed = new Set(categoryKeys);
  const acc = new Map<string, { min: number; max: number }>();
  for (const s of scores) {
    if (!allowed.has(s.categoryKey)) continue;
    const e = acc.get(s.participantId);
    if (e) {
      if (s.value < e.min) e.min = s.value;
      if (s.value > e.max) e.max = s.value;
    } else {
      acc.set(s.participantId, { min: s.value, max: s.value });
    }
  }
  const out = new Map<string, number>();
  for (const [pid, { min, max }] of acc) out.set(pid, max - min);
  return out;
}

// Smallest spread wins. Restricted to `participantIds` (typically the
// non-excluded set). Returns null when no participant in the allowed
// set has any scores.
export function mostBalancedParticipant(
  scores: readonly FlatScore[],
  participantIds: readonly string[],
  categoryKeys: readonly string[],
): { participantId: string; spread: number } | null {
  const allowedPs = new Set(participantIds);
  const spreads = spreadByParticipant(scores, categoryKeys);
  let best: { participantId: string; spread: number } | null = null;
  for (const [pid, spread] of spreads) {
    if (!allowedPs.has(pid)) continue;
    if (best === null || spread < best.spread) {
      best = { participantId: pid, spread };
    }
  }
  return best;
}

// ---- Sort comparators ----------------------------------------------------

export type SortMode =
  | { kind: 'manual' }
  | { kind: 'alpha' }
  | { kind: 'ovrDesc' }
  | { kind: 'mostBalanced' }
  | { kind: 'strongestIn'; categoryKey: string };

type Sortable = {
  id: string;
  name: string;
  excluded: boolean;
  position: number;
};

// Comparator factory. Excluded participants always sort to the bottom
// regardless of mode; ties within an active or excluded group fall back
// to the manual position order so the sort stays stable.
export function compareParticipantsBy(
  mode: SortMode,
  ctx: {
    ovrById: Map<string, number>;
    spreadById: Map<string, number>;
    scoreInCategoryById?: Map<string, number>;
  },
): (a: Sortable, b: Sortable) => number {
  return (a, b) => {
    if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
    const primary = primaryDelta(mode, ctx, a, b);
    if (primary !== 0) return primary;
    return a.position - b.position;
  };
}

function primaryDelta(
  mode: SortMode,
  ctx: {
    ovrById: Map<string, number>;
    spreadById: Map<string, number>;
    scoreInCategoryById?: Map<string, number>;
  },
  a: Sortable,
  b: Sortable,
): number {
  switch (mode.kind) {
    case 'manual':
      return 0;
    case 'alpha':
      return a.name.localeCompare(b.name);
    case 'ovrDesc': {
      const av = ctx.ovrById.get(a.id) ?? -Infinity;
      const bv = ctx.ovrById.get(b.id) ?? -Infinity;
      return bv - av;
    }
    case 'mostBalanced': {
      const av = ctx.spreadById.get(a.id) ?? Infinity;
      const bv = ctx.spreadById.get(b.id) ?? Infinity;
      return av - bv;
    }
    case 'strongestIn': {
      const av = ctx.scoreInCategoryById?.get(a.id) ?? -Infinity;
      const bv = ctx.scoreInCategoryById?.get(b.id) ?? -Infinity;
      return bv - av;
    }
  }
}
