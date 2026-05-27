import type { VoteScore, VoteSubmission } from '../db/votes';

export type ConsensusStat = {
  // Mean rounded to the nearest int — scores are 0..100 ints so the
  // displayed value should be too.
  mean: number;
  // Population variance (sum((v - mean)^2) / n), not sample variance.
  // We're describing the actual voters who showed up, not estimating a
  // larger population.
  variance: number;
  n: number;
};

// participantId -> categoryKey -> stat
export type ConsensusMap = Map<string, Map<string, ConsensusStat>>;

// Pure aggregation. No DB access, no async. Given the cached submissions +
// scores for an evaluation, returns mean/variance/n per participant ×
// category. Participants with zero submissions don't appear in the map —
// downstream UI checks the key.
export function aggregateConsensus(
  submissions: VoteSubmission[],
  scores: VoteScore[],
): ConsensusMap {
  // Drop scores whose parent submission isn't in the submissions list.
  // Shouldn't happen given the FK cascade, but cheap to guard.
  const validSubIds = new Set(submissions.map((s) => s.id));

  const buckets = new Map<string, Map<string, number[]>>();
  for (const score of scores) {
    if (!validSubIds.has(score.submissionId)) continue;
    let inner = buckets.get(score.participantId);
    if (!inner) {
      inner = new Map();
      buckets.set(score.participantId, inner);
    }
    let arr = inner.get(score.categoryKey);
    if (!arr) {
      arr = [];
      inner.set(score.categoryKey, arr);
    }
    arr.push(score.value);
  }

  const result: ConsensusMap = new Map();
  for (const [participantId, inner] of buckets) {
    const outInner = new Map<string, ConsensusStat>();
    for (const [categoryKey, values] of inner) {
      const n = values.length;
      const meanRaw = values.reduce((a, v) => a + v, 0) / n;
      const variance =
        values.reduce((a, v) => a + (v - meanRaw) ** 2, 0) / n;
      outInner.set(categoryKey, {
        mean: Math.round(meanRaw),
        variance,
        n,
      });
    }
    result.set(participantId, outInner);
  }
  return result;
}
