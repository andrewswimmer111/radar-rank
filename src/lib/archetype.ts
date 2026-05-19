import type { ArchetypeRule, Scores, Template } from '@/data/types';

export type ArchetypeResult = { name: string; tagline: string };

export function pickArchetype(template: Template, scores: Scores): ArchetypeResult {
  let best = template.archetypes[0];
  let bestFitness = -Infinity;
  for (const rule of template.archetypes) {
    const f = fitness(rule, scores);
    if (f > bestFitness) {
      bestFitness = f;
      best = rule;
    }
  }
  return { name: best.name, tagline: best.tagline };
}

export function fitness(rule: ArchetypeRule, scores: Scores): number {
  const weights = Object.entries(rule.weights);
  const norm = weights.reduce((acc, [, w]) => acc + Math.abs(w ?? 0), 0) || 1;
  let total = rule.bias ?? 0;
  for (const [key, w] of weights) {
    if (w === undefined) continue;
    const v = clamp01((scores[key] ?? 50) / 100);
    total += w > 0 ? w * v : -w * (1 - v);
  }
  return total / norm;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
