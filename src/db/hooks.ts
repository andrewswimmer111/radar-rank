import { useCallback, useEffect, useMemo, useState } from 'react';

import * as cloudPull from '../cloud/pull';
import * as cloudPush from '../cloud/push';
import { aggregateConsensus, type ConsensusMap } from '../lib/consensus';
import { getDb } from './index';
import * as collectionsDb from './collections';
import * as evaluationsDb from './evaluations';
import * as evaluationCategoriesDb from './evaluationCategories';
import * as participantsDb from './participants';
import * as peopleDb from './people';
import * as scoresDb from './scores';
import * as sharesDb from './shares';
import * as snapshotDb from './snapshot';
import * as templatesDb from './templates';
import * as templateCategoriesDb from './templateCategories';
import * as votesDb from './votes';

export type { Collection, CollectionWithCount } from './collections';
export type { Evaluation } from './evaluations';
export type { EvaluationCategory } from './evaluationCategories';
export type { Participant } from './participants';
export type { Person } from './people';
export type { Score } from './scores';
export type { EvaluationShare } from './shares';
export type { CreateTemplateInput, Template, TemplateAccent } from './templates';
export type { TemplateCategory } from './templateCategories';
export type { VoteSubmission, VoteScore } from './votes';

// ---- pubsub --------------------------------------------------------------

const subscribers = new Map<string, Set<() => void>>();

function subscribe(topics: string[], listener: () => void): () => void {
  for (const t of topics) {
    let set = subscribers.get(t);
    if (!set) {
      set = new Set();
      subscribers.set(t, set);
    }
    set.add(listener);
  }
  return () => {
    for (const t of topics) {
      const set = subscribers.get(t);
      if (!set) continue;
      set.delete(listener);
      if (set.size === 0) subscribers.delete(t);
    }
  };
}

function publish(...topics: string[]): void {
  const notified = new Set<() => void>();
  for (const t of topics) {
    subscribers.get(t)?.forEach((l) => notified.add(l));
  }
  notified.forEach((l) => l());
}

// Notifies every mounted resource hook to refetch. Used after a bulk backup
// restore, which can touch any table (and `replace` wipes everything), so
// targeted topic invalidation isn't enough.
export function publishAll(): void {
  const all = new Set<() => void>();
  for (const set of subscribers.values()) set.forEach((l) => all.add(l));
  all.forEach((l) => l());
}

const T = {
  collections: 'collections',
  collection: (id: string) => `collection:${id}`,
  people: (collectionId: string) => `people:${collectionId}`,
  templates: 'templates',
  template: (id: string) => `template:${id}`,
  templateCategories: (templateId: string) => `templateCategories:${templateId}`,
  evaluations: 'evaluations',
  evaluation: (id: string) => `evaluation:${id}`,
  participants: (evaluationId: string) => `participants:${evaluationId}`,
  evaluationCategories: (evaluationId: string) => `evaluationCategories:${evaluationId}`,
  scores: (evaluationId: string) => `scores:${evaluationId}`,
  share: (evaluationId: string) => `share:${evaluationId}`,
  voteSubmissions: (evaluationId: string) => `voteSubmissions:${evaluationId}`,
};

// ---- Generic resource hook -----------------------------------------------

export type Resource<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function useResource<T>(
  topicsKey: string,
  fetcher: () => Promise<T>,
): Resource<T> {
  const [state, setState] = useState<Resource<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    // Reset on topic-key change so id-changing hooks don't flash stale data.
    // Pubsub-triggered reloads keep the existing data visible while refetching.
    setState({ data: null, loading: true, error: null });

    const reload = () => {
      fetcher()
        .then((data) => {
          if (!cancelled) setState({ data, loading: false, error: null });
        })
        .catch((error: Error) => {
          if (!cancelled) setState({ data: null, loading: false, error });
        });
    };

    reload();
    const unsubscribe = subscribe(topicsKey.split('|'), reload);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [topicsKey, fetcher]);

  return state;
}

// ---- Read hooks ----------------------------------------------------------

export function useCollections() {
  const fetcher = useCallback(() => collectionsDb.listCollections(), []);
  return useResource(T.collections, fetcher);
}

export function useCollection(id: string) {
  const fetcher = useCallback(() => collectionsDb.getCollection(id), [id]);
  return useResource(`${T.collection(id)}|${T.collections}`, fetcher);
}

export function usePeopleForCollection(collectionId: string) {
  const fetcher = useCallback(
    () => peopleDb.listPeopleForCollection(collectionId),
    [collectionId],
  );
  return useResource(T.people(collectionId), fetcher);
}

export function useTemplates() {
  const fetcher = useCallback(() => templatesDb.listTemplates(), []);
  return useResource(T.templates, fetcher);
}

export function useTemplate(id: string) {
  const fetcher = useCallback(() => templatesDb.getTemplate(id), [id]);
  return useResource(`${T.template(id)}|${T.templates}`, fetcher);
}

export function useTemplateCategories(templateId: string) {
  const fetcher = useCallback(
    () => templateCategoriesDb.listTemplateCategories(templateId),
    [templateId],
  );
  return useResource(T.templateCategories(templateId), fetcher);
}

export function useEvaluations() {
  const fetcher = useCallback(() => evaluationsDb.listEvaluations(), []);
  return useResource(T.evaluations, fetcher);
}

export function useEvaluation(id: string) {
  const fetcher = useCallback(() => evaluationsDb.getEvaluation(id), [id]);
  return useResource(`${T.evaluation(id)}|${T.evaluations}`, fetcher);
}

export function useParticipants(evaluationId: string) {
  const fetcher = useCallback(
    () => participantsDb.listParticipants(evaluationId),
    [evaluationId],
  );
  return useResource(T.participants(evaluationId), fetcher);
}

export function useEvaluationCategories(evaluationId: string) {
  const fetcher = useCallback(
    () => evaluationCategoriesDb.listEvaluationCategories(evaluationId),
    [evaluationId],
  );
  return useResource(T.evaluationCategories(evaluationId), fetcher);
}

export function useScores(evaluationId: string) {
  const fetcher = useCallback(
    () => scoresDb.listScoresForEvaluation(evaluationId),
    [evaluationId],
  );
  return useResource(T.scores(evaluationId), fetcher);
}

export function useShare(evaluationId: string) {
  const fetcher = useCallback(
    () => sharesDb.getShareForEvaluation(evaluationId),
    [evaluationId],
  );
  return useResource(T.share(evaluationId), fetcher);
}

export function useSubmissionCount(evaluationId: string) {
  const fetcher = useCallback(
    () => votesDb.countSubmissions(evaluationId),
    [evaluationId],
  );
  return useResource(T.voteSubmissions(evaluationId), fetcher);
}

export function useVoteSubmissions(evaluationId: string) {
  const fetcher = useCallback(
    () => votesDb.listSubmissions(evaluationId),
    [evaluationId],
  );
  return useResource(T.voteSubmissions(evaluationId), fetcher);
}

export function useVoteScores(evaluationId: string) {
  const fetcher = useCallback(
    () => votesDb.listScoresForEvaluation(evaluationId),
    [evaluationId],
  );
  // Same invalidation topic as submissions — the vote cache moves atomically.
  return useResource(T.voteSubmissions(evaluationId), fetcher);
}

// Derives consensus stats client-side from the vote cache. Returns null
// until both underlying hooks have loaded so consumers don't render a
// half-aggregated map.
export function useConsensus(evaluationId: string): ConsensusMap | null {
  const { data: subs } = useVoteSubmissions(evaluationId);
  const { data: scores } = useVoteScores(evaluationId);
  return useMemo(() => {
    if (!subs || !scores) return null;
    return aggregateConsensus(subs, scores);
  }, [subs, scores]);
}

// ---- Mutations (CRUD + invalidation) -------------------------------------
//
// These wrap the pure CRUD functions and publish the affected topics so
// mounted read hooks re-fetch. Consumers should prefer these over the
// raw CRUD imports.

// Collections
export async function createCollection(input: { name: string }) {
  const c = await collectionsDb.createCollection(input);
  publish(T.collections);
  return c;
}

export async function updateCollection(id: string, patch: { name: string }) {
  await collectionsDb.updateCollection(id, patch);
  publish(T.collections, T.collection(id));
}

export async function deleteCollection(id: string) {
  await collectionsDb.deleteCollection(id);
  publish(T.collections, T.collection(id), T.people(id));
}

// People
export async function createPerson(input: {
  collectionId: string;
  name: string;
  color?: string | null;
}) {
  const p = await peopleDb.createPerson(input);
  publish(T.people(input.collectionId), T.collections);
  return p;
}

export async function updatePerson(
  id: string,
  collectionId: string,
  patch: { name?: string; color?: string | null },
) {
  await peopleDb.updatePerson(id, patch);
  publish(T.people(collectionId));
}

export async function deletePerson(id: string, collectionId: string) {
  await peopleDb.deletePerson(id);
  publish(T.people(collectionId), T.collections);
}

export async function reorderPeople(
  collectionId: string,
  orderedIds: string[],
) {
  await peopleDb.reorderPeople(collectionId, orderedIds);
  publish(T.people(collectionId));
}

// Templates
export async function createTemplate(input: templatesDb.CreateTemplateInput) {
  const t = await templatesDb.createTemplate(input);
  publish(T.templates);
  return t;
}

export async function updateTemplate(
  id: string,
  patch: Parameters<typeof templatesDb.updateTemplate>[1],
) {
  await templatesDb.updateTemplate(id, patch);
  publish(T.templates, T.template(id));
}

export async function deleteTemplate(id: string) {
  await templatesDb.deleteTemplate(id);
  publish(T.templates, T.template(id), T.templateCategories(id));
}

// Template categories
export async function createTemplateCategory(
  input: Parameters<typeof templateCategoriesDb.createTemplateCategory>[0],
) {
  const c = await templateCategoriesDb.createTemplateCategory(input);
  publish(T.templateCategories(input.templateId));
  return c;
}

export async function updateTemplateCategory(
  id: string,
  templateId: string,
  patch: Parameters<typeof templateCategoriesDb.updateTemplateCategory>[1],
) {
  await templateCategoriesDb.updateTemplateCategory(id, patch);
  publish(T.templateCategories(templateId));
}

export async function deleteTemplateCategory(id: string, templateId: string) {
  await templateCategoriesDb.deleteTemplateCategory(id);
  publish(T.templateCategories(templateId));
}

export async function reorderTemplateCategories(
  templateId: string,
  orderedIds: string[],
) {
  await templateCategoriesDb.reorderTemplateCategories(templateId, orderedIds);
  publish(T.templateCategories(templateId));
}

// Evaluations
export async function createEvaluation(
  input: Parameters<typeof evaluationsDb.createEvaluation>[0],
) {
  const e = await evaluationsDb.createEvaluation(input);
  publish(T.evaluations);
  return e;
}

export async function updateEvaluation(id: string, patch: { title: string }) {
  await evaluationsDb.updateEvaluation(id, patch);
  publish(T.evaluations, T.evaluation(id));
}

export async function deleteEvaluation(id: string) {
  // Best-effort cloud cleanup. Don't block local delete on network errors —
  // an orphaned cloud row stays RLS-protected and the user's local state
  // still gets cleaned up.
  try {
    await cloudPush.purgeShare(id);
  } catch {
    // swallow
  }
  await evaluationsDb.deleteEvaluation(id);
  publish(
    T.evaluations,
    T.evaluation(id),
    T.participants(id),
    T.evaluationCategories(id),
    T.scores(id),
    T.share(id),
    T.voteSubmissions(id),
  );
}

export async function touchEvaluation(id: string) {
  await evaluationsDb.touchEvaluation(id);
  publish(T.evaluations, T.evaluation(id));
}

// Participants
export async function createParticipant(
  input: Parameters<typeof participantsDb.createParticipant>[0],
) {
  const p = await participantsDb.createParticipant(input);
  publish(T.participants(input.evaluationId), T.evaluations);
  return p;
}

export async function updateParticipant(
  id: string,
  evaluationId: string,
  patch: Parameters<typeof participantsDb.updateParticipant>[1],
) {
  await participantsDb.updateParticipant(id, patch);
  // excluded flips affect aggregate metrics, so refresh the parent list too.
  publish(T.participants(evaluationId), T.evaluations);
}

export async function deleteParticipant(id: string, evaluationId: string) {
  await participantsDb.deleteParticipant(id);
  publish(
    T.participants(evaluationId),
    T.scores(evaluationId),
    T.evaluations,
  );
}

// Evaluation categories
export async function createEvaluationCategory(
  input: Parameters<typeof evaluationCategoriesDb.createEvaluationCategory>[0],
) {
  const c = await evaluationCategoriesDb.createEvaluationCategory(input);
  publish(T.evaluationCategories(input.evaluationId));
  return c;
}

// Scores
export async function upsertScore(input: scoresDb.Score) {
  await scoresDb.upsertScore(input);
  // OVR / percentile derived from scores → bump the evaluations list too.
  publish(T.scores(input.evaluationId), T.evaluations);
}

// Snapshot creates a full evaluation from a collection × template in a
// single transaction. One invalidation fires at the end.
export async function snapshotEvaluation(
  input: Parameters<typeof snapshotDb.snapshotEvaluation>[0],
): Promise<string> {
  const id = await snapshotDb.snapshotEvaluation(input);
  publish(T.evaluations);
  return id;
}

// Sharing
export async function shareEvaluation(evaluationId: string) {
  const share = await cloudPush.pushEvaluation(evaluationId);
  publish(T.share(evaluationId), T.evaluations);
  return share;
}

// Pause voting: the link starts rejecting submissions, but the share
// row and cached votes survive so the consensus tab keeps showing what
// it had at freeze time. No voteSubmissions invalidation — that cache
// is unchanged.
export async function freezeEvaluation(evaluationId: string) {
  await cloudPush.freezeEvaluation(evaluationId);
  publish(T.share(evaluationId), T.evaluations);
}

export async function resumeEvaluation(evaluationId: string) {
  await cloudPush.resumeEvaluation(evaluationId);
  publish(T.share(evaluationId), T.evaluations);
}

export async function refreshSubmissions(evaluationId: string) {
  await cloudPull.pullSubmissionsForEvaluation(evaluationId);
  // share gets touched (last_pulled_at), submissions cache may have new
  // rows — invalidate both so any mounted consumers refetch.
  publish(T.voteSubmissions(evaluationId), T.share(evaluationId));
}

// Owner-side cleanup: delete a single voter's submission. Cloud is the
// source of truth, so the local cache is reconciled via a follow-up pull
// rather than a local DELETE — matches the rest of the vote sync flow.
export async function deleteVoteSubmission(
  evaluationId: string,
  submissionId: string,
) {
  await cloudPush.deleteSubmission(evaluationId, submissionId);
  await cloudPull.pullSubmissionsForEvaluation(evaluationId);
  publish(T.voteSubmissions(evaluationId), T.share(evaluationId));
}

export async function renameVoteSubmission(
  evaluationId: string,
  submissionId: string,
  voterName: string,
) {
  await cloudPush.renameSubmission(evaluationId, submissionId, voterName);
  await cloudPull.pullSubmissionsForEvaluation(evaluationId);
  publish(T.voteSubmissions(evaluationId), T.share(evaluationId));
}

// Wipes all user-owned data in one transaction. Cascades clear people,
// participants, categories, and scores; built-in templates are preserved
// (every install seeds the same stable-id set). Theme and other prefs in
// app_state are left intact.
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM evaluations');
    await db.runAsync('DELETE FROM collections');
    await db.runAsync('DELETE FROM templates WHERE is_builtin = 0');
  });
  publishAll();
}
