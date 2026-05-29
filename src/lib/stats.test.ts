// Run with: npx tsx src/lib/stats.test.ts
//
// Not auto-discovered by any test runner — there isn't one in this repo.
// Lives next to stats.ts because Metro only bundles files reachable from the
// app entry point, and nothing imports this.

import {
  categoryVariance,
  closestPairs,
  strongestSpecialist,
} from './stats';

type FlatScore = { participantId: string; categoryKey: string; value: number };

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ok  ${name}`);
    pass++;
  } else {
    console.error(`  FAIL  ${name}`);
    fail++;
  }
}

function s(participantId: string, categoryKey: string, value: number): FlatScore {
  return { participantId, categoryKey, value };
}

const CATS = ['speed', 'power', 'iq'];

// --- categoryVariance ------------------------------------------------------
{
  // p1 = [80,80,80], p2 = [20,20,20]. Per category: mean 50, var = 900.
  const scores = [
    s('p1', 'speed', 80), s('p1', 'power', 80), s('p1', 'iq', 80),
    s('p2', 'speed', 20), s('p2', 'power', 20), s('p2', 'iq', 20),
  ];
  const v = categoryVariance(scores, CATS, ['p1', 'p2']);
  check('variance: identical across cats', v.get('speed') === 900 && v.get('iq') === 900);
}
{
  // Missing scores default to 50: p2 'iq' absent → [80,50], mean 65, var 225.
  const scores = [s('p1', 'iq', 80)];
  const v = categoryVariance(scores, ['iq'], ['p1', 'p2']);
  check('variance: missing defaults to 50', v.get('iq') === 225);
}
{
  check('variance: empty participants → empty map',
    categoryVariance([], CATS, []).size === 0);
}

// --- strongestSpecialist ---------------------------------------------------
{
  // p1 spread = 90-10 = 80 (peak power). p2 spread = 60-40 = 20.
  const scores = [
    s('p1', 'speed', 10), s('p1', 'power', 90), s('p1', 'iq', 50),
    s('p2', 'speed', 40), s('p2', 'power', 60), s('p2', 'iq', 50),
  ];
  const r = strongestSpecialist(scores, ['p1', 'p2'], CATS);
  check('specialist: picks largest spread', r?.participantId === 'p1');
  check('specialist: surfaces peak category', r?.topCategoryKey === 'power' && r?.topScore === 90);
  check('specialist: reports spread', r?.spread === 80);
}
{
  check('specialist: no participants → null',
    strongestSpecialist([], [], CATS) === null);
}

// --- closestPairs ----------------------------------------------------------
{
  // p1≈p2 (close), p3 far. Closest pair should be (p1,p2), unordered.
  const scores = [
    s('p1', 'speed', 50), s('p1', 'power', 50), s('p1', 'iq', 50),
    s('p2', 'speed', 52), s('p2', 'power', 48), s('p2', 'iq', 50),
    s('p3', 'speed', 95), s('p3', 'power', 5), s('p3', 'iq', 90),
  ];
  const pairs = closestPairs(scores, ['p1', 'p2', 'p3'], CATS);
  check('closest: 3 participants → 3 pairs', pairs.length === 3);
  const top = pairs[0];
  const isP1P2 =
    (top.aId === 'p1' && top.bId === 'p2') ||
    (top.aId === 'p2' && top.bId === 'p1');
  check('closest: nearest pair is p1/p2', isP1P2);
  check('closest: sorted ascending by distance', pairs[0].distance <= pairs[1].distance);
  check('closest: identical profiles → 100% similarity',
    closestPairs(
      [
        s('a', 'speed', 70), s('a', 'iq', 70),
        s('b', 'speed', 70), s('b', 'iq', 70),
      ],
      ['a', 'b'],
      ['speed', 'iq'],
    )[0].similarity === 100);
}
{
  check('closest: fewer than 2 participants → []',
    closestPairs([s('p1', 'speed', 50)], ['p1'], CATS).length === 0);
  check('closest: respects limit',
    closestPairs(
      [
        s('p1', 'x', 10), s('p2', 'x', 20), s('p3', 'x', 30), s('p4', 'x', 40),
      ],
      ['p1', 'p2', 'p3', 'p4'],
      ['x'],
      2,
    ).length === 2);
}

// --- Summary ---------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
