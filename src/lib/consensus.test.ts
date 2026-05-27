// Run with: npx tsx src/lib/consensus.test.ts
//
// Not auto-discovered by any test runner — there isn't one in this repo.
// Lives next to consensus.ts because Metro only bundles files reachable
// from the app entry point, and nothing imports this.

import type { VoteScore, VoteSubmission } from '../db/votes';

import { aggregateConsensus, type ConsensusStat } from './consensus';

let pass = 0;
let fail = 0;

function approxEq(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

function check(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ok  ${name}`);
    pass++;
  } else {
    console.error(`  FAIL  ${name}`);
    fail++;
  }
}

function statEq(s: ConsensusStat | undefined, expected: ConsensusStat): boolean {
  if (!s) return false;
  return (
    s.mean === expected.mean &&
    s.n === expected.n &&
    approxEq(s.variance, expected.variance)
  );
}

function sub(id: string): VoteSubmission {
  return {
    id,
    evaluationId: 'eval-1',
    voterName: `voter-${id}`,
    submittedAt: 0,
  };
}

function score(
  submissionId: string,
  participantId: string,
  categoryKey: string,
  value: number,
): VoteScore {
  return { submissionId, participantId, categoryKey, value };
}

// --- Test 1: empty input --------------------------------------------------
{
  const out = aggregateConsensus([], []);
  check('empty input → empty map', out.size === 0);
}

// --- Test 2: single submission, single participant, single category -------
{
  const subs = [sub('s1')];
  const scores = [score('s1', 'p1', 'speed', 80)];
  const out = aggregateConsensus(subs, scores);
  const stat = out.get('p1')?.get('speed');
  check(
    'n=1 → mean=value, variance=0',
    statEq(stat, { mean: 80, variance: 0, n: 1 }),
  );
}

// --- Test 3: two submissions, integer mean ---------------------------------
{
  const subs = [sub('s1'), sub('s2')];
  const scores = [
    score('s1', 'p1', 'speed', 60),
    score('s2', 'p1', 'speed', 80),
  ];
  const out = aggregateConsensus(subs, scores);
  const stat = out.get('p1')?.get('speed');
  // mean = 70, variance = (10^2 + 10^2)/2 = 100
  check(
    'n=2, [60,80] → mean=70, variance=100',
    statEq(stat, { mean: 70, variance: 100, n: 2 }),
  );
}

// --- Test 4: three submissions, non-integer mean rounds ---------------------
{
  const subs = [sub('s1'), sub('s2'), sub('s3')];
  const scores = [
    score('s1', 'p1', 'speed', 50),
    score('s2', 'p1', 'speed', 60),
    score('s3', 'p1', 'speed', 71),
  ];
  // raw mean = 60.333, rounded = 60
  // variance: sum((v - 60.333)^2)/3
  const raw = (50 + 60 + 71) / 3;
  const expectedVariance =
    ((50 - raw) ** 2 + (60 - raw) ** 2 + (71 - raw) ** 2) / 3;
  const out = aggregateConsensus(subs, scores);
  const stat = out.get('p1')?.get('speed');
  check(
    'rounds mean to nearest int',
    stat?.mean === 60,
  );
  check(
    'population variance over 3',
    !!stat && approxEq(stat.variance, expectedVariance),
  );
}

// --- Test 5: participants with no scores are absent from the map -----------
{
  const subs = [sub('s1')];
  const scores = [
    score('s1', 'p1', 'speed', 80),
    // p2 has no scores
  ];
  const out = aggregateConsensus(subs, scores);
  check('participant with no scores → not in map', !out.has('p2'));
  check('participant with scores → in map', out.has('p1'));
}

// --- Test 6: orphan scores (submission missing) are dropped ----------------
{
  const subs = [sub('s1')];
  const scores = [
    score('s1', 'p1', 'speed', 80),
    score('orphan', 'p1', 'speed', 999),
  ];
  const out = aggregateConsensus(subs, scores);
  const stat = out.get('p1')?.get('speed');
  check(
    'orphan score filtered out',
    statEq(stat, { mean: 80, variance: 0, n: 1 }),
  );
}

// --- Summary ---------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
