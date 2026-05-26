import { getEvaluation } from '../db/evaluations';
import { listEvaluationCategories } from '../db/evaluationCategories';
import { listParticipants } from '../db/participants';
import {
  createShare,
  deleteShare,
  getShareForEvaluation,
  type EvaluationShare,
} from '../db/shares';
import { getTemplate } from '../db/templates';

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

// Mirror of pushEvaluation. Deletes the cloud parent (cascade wipes children
// + submissions + scores), then drops the local share row (cascade wipes
// local vote cache via the FK chain set up in plan-2's v2 migration).
//
// Cloud-side failure is fatal — we don't want to delete local state while
// the cloud row still exists and could be polled / voted on. A no-op
// (no local share) is silently fine.
export async function unshareEvaluation(evaluationId: string): Promise<void> {
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
