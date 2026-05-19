import { pickArchetype } from '../src/lib/archetype.ts';
import { TEMPLATES, defaultScoresFor } from '../src/data/templates.ts';
import type { Scores, Template } from '../src/data/types.ts';

type Regime = (t: Template) => Scores;

const regimes: Record<string, Regime> = {
  allHigh: (t) => fill(t, () => 90),
  allLow: (t) => fill(t, () => 10),
  lopsidedStrength: (t) => fill(t, (_, i) => (i < 2 ? 90 : 30)),
  lopsidedWeakness: (t) => fill(t, (_, i) => (i < 2 ? 10 : 80)),
};

function fill(t: Template, f: (key: string, i: number) => number): Scores {
  const s = defaultScoresFor(t);
  t.categories.forEach((c, i) => {
    s[c.key] = f(c.key, i);
  });
  return s;
}

let failed = 0;
for (const template of TEMPLATES) {
  const seen = new Set<string>();
  console.log(`\n${template.label}:`);
  for (const [regimeName, regimeFn] of Object.entries(regimes)) {
    const scores = regimeFn(template);
    const { name, tagline } = pickArchetype(template, scores);
    seen.add(name);
    console.log(`  ${regimeName.padEnd(18)} → ${name} — ${tagline}`);
  }
  if (seen.size < 3) {
    console.error(`  ❌ only ${seen.size} distinct archetypes across 4 regimes`);
    failed++;
  } else {
    console.log(`  ✓ ${seen.size} distinct archetypes`);
  }
  const validKeys = new Set(template.categories.map((c) => c.key));
  for (const rule of template.archetypes) {
    for (const k of Object.keys(rule.weights)) {
      if (!validKeys.has(k)) {
        console.error(`  ❌ rule "${rule.name}" references unknown key "${k}"`);
        failed++;
      }
    }
  }
  if (template.categories.length < 5 || template.categories.length > 8) {
    console.error(`  ❌ category count ${template.categories.length} outside [5,8]`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} failures`);
  process.exit(1);
}
console.log('\nall templates valid');
