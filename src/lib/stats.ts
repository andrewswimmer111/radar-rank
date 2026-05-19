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
