import { getDb } from './index';
import { now } from './util';

export type EvaluationShare = {
  evaluationId: string;
  cloudId: string;
  viewToken: string;
  voteToken: string;
  ownerInstallId: string;
  sharedAt: number;
  lastPulledAt: number | null;
  frozenAt: number | null;
};

type Row = {
  evaluation_id: string;
  cloud_id: string;
  view_token: string;
  vote_token: string;
  owner_install_id: string;
  shared_at: number;
  last_pulled_at: number | null;
  frozen_at: number | null;
};

function fromRow(r: Row): EvaluationShare {
  return {
    evaluationId: r.evaluation_id,
    cloudId: r.cloud_id,
    viewToken: r.view_token,
    voteToken: r.vote_token,
    ownerInstallId: r.owner_install_id,
    sharedAt: r.shared_at,
    lastPulledAt: r.last_pulled_at,
    frozenAt: r.frozen_at,
  };
}

export async function createShare(input: {
  evaluationId: string;
  cloudId: string;
  viewToken: string;
  voteToken: string;
  ownerInstallId: string;
}): Promise<EvaluationShare> {
  const db = await getDb();
  const ts = now();
  await db.runAsync(
    `INSERT INTO evaluation_shares
       (evaluation_id, cloud_id, view_token, vote_token, owner_install_id, shared_at, last_pulled_at, frozen_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
    [
      input.evaluationId,
      input.cloudId,
      input.viewToken,
      input.voteToken,
      input.ownerInstallId,
      ts,
    ],
  );
  return { ...input, sharedAt: ts, lastPulledAt: null, frozenAt: null };
}

export async function getShareForEvaluation(
  evaluationId: string,
): Promise<EvaluationShare | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM evaluation_shares WHERE evaluation_id = ?',
    [evaluationId],
  );
  return row ? fromRow(row) : null;
}

export async function deleteShare(evaluationId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM evaluation_shares WHERE evaluation_id = ?',
    [evaluationId],
  );
}

export async function touchSharePulledAt(evaluationId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE evaluation_shares SET last_pulled_at = ? WHERE evaluation_id = ?',
    [now(), evaluationId],
  );
}

// Pass a timestamp to freeze, or null to resume. The share row itself
// stays put either way — votes and submissions remain in the cache.
export async function setShareFrozenAt(
  evaluationId: string,
  frozenAt: number | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE evaluation_shares SET frozen_at = ? WHERE evaluation_id = ?',
    [frozenAt, evaluationId],
  );
}
