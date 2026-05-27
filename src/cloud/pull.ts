import { getShareForEvaluation, touchSharePulledAt } from '../db/shares';
import { replaceSubmissionsForEvaluation } from '../db/votes';

import { withViewToken } from './client';

type CloudVoteScore = {
  participant_local_id: string;
  category_key: string;
  value: number;
};

type CloudSubmission = {
  id: string;
  voter_name: string;
  submitted_at: string;
  vote_scores: CloudVoteScore[];
};

// Fetch all submissions + scores for a shared evaluation and replace the
// local cache. No-op when the evaluation isn't shared. Cloud is the
// source of truth; this function never writes to the cloud.
//
// PostgREST embeds vote_scores via the submission_id FK so the whole
// snapshot lands in one HTTP call.
export async function pullSubmissionsForEvaluation(
  evaluationId: string,
): Promise<void> {
  const share = await getShareForEvaluation(evaluationId);
  if (!share) return;

  const sb = withViewToken(share.viewToken);
  const { data, error } = await sb
    .from('vote_submissions')
    .select(
      'id, voter_name, submitted_at, vote_scores(participant_local_id, category_key, value)',
    )
    .eq('shared_evaluation_id', share.cloudId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;

  const payload = ((data ?? []) as CloudSubmission[]).map((s) => ({
    submission: {
      id: s.id,
      voterName: s.voter_name,
      submittedAt: Date.parse(s.submitted_at),
    },
    scores: s.vote_scores.map((sc) => ({
      participantId: sc.participant_local_id,
      categoryKey: sc.category_key,
      value: sc.value,
    })),
  }));

  await replaceSubmissionsForEvaluation(evaluationId, payload);
  await touchSharePulledAt(evaluationId);
}
