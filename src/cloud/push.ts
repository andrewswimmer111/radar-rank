import { getEvaluation } from '../db/evaluations';
import { listEvaluationCategories } from '../db/evaluationCategories';
import { listParticipants } from '../db/participants';
import {
  createShare,
  deleteShare,
  getShareForEvaluation,
  setShareFrozenAt,
  type EvaluationShare,
} from '../db/shares';
import { getTemplate } from '../db/templates';
import { now } from '../db/util';

import { withViewToken } from './client';
import { getOrCreateInstallId } from './installId';
import { generateToken } from './tokens';

// Push a local evaluation's snapshot to the cloud and persist share state
// locally. Order: cloud first, local second — so a cloud-side failure
// leaves no orphaned local share row claiming a cloud_id that doesn't exist.
//
// Soft-freeze contract: callers should refuse to push if a share already
// exists. This function double-checks and throws to make the invariant
// load-bearing rather than implicit.
export async function pushEvaluation(
  evaluationId: string,
): Promise<EvaluationShare> {
  const existing = await getShareForEvaluation(evaluationId);
  if (existing) {
    throw new Error('Evaluation is already shared');
  }

  const evaluation = await getEvaluation(evaluationId);
  if (!evaluation) throw new Error(`Evaluation ${evaluationId} not found`);
  if (!evaluation.originTemplateId) {
    throw new Error(
      'Cannot share an evaluation whose origin template has been deleted',
    );
  }
  const template = await getTemplate(evaluation.originTemplateId);
  if (!template) {
    throw new Error(
      'Cannot share an evaluation whose origin template has been deleted',
    );
  }

  const [participants, categories, ownerInstallId] = await Promise.all([
    listParticipants(evaluationId),
    listEvaluationCategories(evaluationId),
    getOrCreateInstallId(),
  ]);

  const viewToken = generateToken();
  const voteToken = generateToken();
  const supabase = withViewToken(viewToken);

  // Step 1: insert the parent. RLS-side, the SELECT half of
  // .insert().select() requires the matching view_token header — which the
  // client above carries.
  const { data: inserted, error: parentErr } = await supabase
    .from('shared_evaluations')
    .insert({
      local_id: evaluation.id,
      owner_install_id: ownerInstallId,
      title: evaluation.title,
      accent_start: template.accent.start,
      accent_end: template.accent.end,
      accent_glow: template.accent.glow,
      view_token: viewToken,
      vote_token: voteToken,
    })
    .select()
    .single();
  if (parentErr || !inserted) {
    throw parentErr ?? new Error('Failed to insert shared_evaluations');
  }
  const cloudId = inserted.id as string;

  // Steps 2 & 3: batch insert children. On any failure here, delete the
  // parent so cascade wipes the partial state cloud-side.
  try {
    if (participants.length > 0) {
      const { error } = await supabase.from('shared_participants').insert(
        participants.map((p) => ({
          shared_evaluation_id: cloudId,
          local_id: p.id,
          name: p.name,
          color: p.color,
          position: p.position,
        })),
      );
      if (error) throw error;
    }
    if (categories.length > 0) {
      const { error } = await supabase.from('shared_categories').insert(
        categories.map((c) => ({
          shared_evaluation_id: cloudId,
          key: c.key,
          label: c.label,
          hint: c.hint,
          position: c.position,
        })),
      );
      if (error) throw error;
    }
  } catch (err) {
    await supabase.from('shared_evaluations').delete().eq('id', cloudId);
    throw err;
  }

  // Cloud rows are committed. Persist local share state.
  return createShare({
    evaluationId,
    cloudId,
    viewToken,
    voteToken,
    ownerInstallId,
  });
}

// Pause voting without tearing anything down. The cloud row is updated
// in place — voters with the link see a "voting paused" state and any
// in-flight submit_vote calls are rejected. Local vote cache is
// untouched, so the consensus tab keeps showing the same numbers it
// did the moment we froze. Cloud-side failure is fatal; we don't want
// the local row to claim frozen while the cloud is still accepting.
//
// UPDATE on shared_evaluations is gated by the "update by view_token"
// RLS policy + a SELECT round-trip via .select() so a silent miss
// (no-op UPDATE that affected 0 rows because RLS blocked it) surfaces
// as a real error instead of leaving cloud + local out of sync.
export async function freezeEvaluation(evaluationId: string): Promise<void> {
  const share = await getShareForEvaluation(evaluationId);
  if (!share) return;
  if (share.frozenAt !== null) return;

  const ts = now();
  const supabase = withViewToken(share.viewToken);
  const { data, error } = await supabase
    .from('shared_evaluations')
    .update({ frozen_at: new Date(ts).toISOString() })
    .eq('id', share.cloudId)
    .select('id');
  if (error) throw new Error(`Cloud freeze failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      'Cloud freeze affected no rows — RLS denied the update or the cloud row was deleted.',
    );
  }

  await setShareFrozenAt(evaluationId, ts);
}

// Reverse of freezeEvaluation — same tokens, same cloud_id, voters with
// the original link can submit again. No-op if the share isn't frozen.
export async function resumeEvaluation(evaluationId: string): Promise<void> {
  const share = await getShareForEvaluation(evaluationId);
  if (!share) return;
  if (share.frozenAt === null) return;

  const supabase = withViewToken(share.viewToken);
  const { data, error } = await supabase
    .from('shared_evaluations')
    .update({ frozen_at: null })
    .eq('id', share.cloudId)
    .select('id');
  if (error) throw new Error(`Cloud resume failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      'Cloud resume affected no rows — RLS denied the update or the cloud row was deleted.',
    );
  }

  await setShareFrozenAt(evaluationId, null);
}

// Owner deletes a single voter's submission. Cloud-side first (vote_scores
// cascade on submission delete), then a pull so the local cache matches.
// Throws on RLS denial or missing share.
export async function deleteSubmission(
  evaluationId: string,
  submissionId: string,
): Promise<void> {
  const share = await getShareForEvaluation(evaluationId);
  if (!share) throw new Error('Evaluation is not shared');

  const supabase = withViewToken(share.viewToken);
  const { data, error } = await supabase
    .from('vote_submissions')
    .delete()
    .eq('id', submissionId)
    .select('id');
  if (error) throw new Error(`Cloud delete failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      'Cloud delete affected no rows — RLS denied the update or the submission no longer exists.',
    );
  }
}

// Owner renames a voter on an existing submission. Trimmed name is
// required; an empty string is rejected before the cloud round-trip so we
// don't leak validation through PostgREST errors.
export async function renameSubmission(
  evaluationId: string,
  submissionId: string,
  voterName: string,
): Promise<void> {
  const trimmed = voterName.trim();
  if (!trimmed) throw new Error('Voter name is required');

  const share = await getShareForEvaluation(evaluationId);
  if (!share) throw new Error('Evaluation is not shared');

  const supabase = withViewToken(share.viewToken);
  const { data, error } = await supabase
    .from('vote_submissions')
    .update({ voter_name: trimmed })
    .eq('id', submissionId)
    .select('id');
  if (error) throw new Error(`Cloud rename failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      'Cloud rename affected no rows — RLS denied the update or the submission no longer exists.',
    );
  }
}

// Hard-delete the cloud row and local share state. Used by
// deleteEvaluation — the user is throwing the evaluation away entirely,
// so the freeze semantics don't apply. Cloud-side cascade wipes
// participants, categories, submissions, and scores; local FK cascade
// then takes care of vote_submissions + vote_scores when the share row
// is deleted.
export async function purgeShare(evaluationId: string): Promise<void> {
  const share = await getShareForEvaluation(evaluationId);
  if (!share) return;

  const supabase = withViewToken(share.viewToken);
  const { error } = await supabase
    .from('shared_evaluations')
    .delete()
    .eq('id', share.cloudId);
  if (error) throw error;

  await deleteShare(evaluationId);
}
