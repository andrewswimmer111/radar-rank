import { getDb } from './index';
import { genId, now } from './util';

export type Evaluation = {
  id: string;
  title: string;
  originCollectionId: string | null;
  originTemplateId: string | null;
  createdAt: number;
  updatedAt: number;
};

type Row = {
  id: string;
  title: string;
  origin_collection_id: string | null;
  origin_template_id: string | null;
  created_at: number;
  updated_at: number;
};

function fromRow(r: Row): Evaluation {
  return {
    id: r.id,
    title: r.title,
    originCollectionId: r.origin_collection_id,
    originTemplateId: r.origin_template_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createEvaluation(input: {
  title: string;
  originCollectionId?: string | null;
  originTemplateId?: string | null;
}): Promise<Evaluation> {
  const db = await getDb();
  const id = genId();
  const ts = now();
  const oc = input.originCollectionId ?? null;
  const ot = input.originTemplateId ?? null;
  await db.runAsync(
    `INSERT INTO evaluations
      (id, title, origin_collection_id, origin_template_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.title, oc, ot, ts, ts],
  );
  return {
    id,
    title: input.title,
    originCollectionId: oc,
    originTemplateId: ot,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function updateEvaluation(
  id: string,
  patch: { title: string },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE evaluations SET title = ?, updated_at = ? WHERE id = ?',
    [patch.title, now(), id],
  );
}

export async function deleteEvaluation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM evaluations WHERE id = ?', [id]);
}

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM evaluations WHERE id = ?',
    [id],
  );
  return row ? fromRow(row) : null;
}

export async function listEvaluations(): Promise<Evaluation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM evaluations ORDER BY updated_at DESC',
  );
  return rows.map(fromRow);
}

// Bump updated_at without changing other fields. Used when downstream
// edits (participants, scores) should resurface the evaluation in the
// recency-sorted list.
export async function touchEvaluation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE evaluations SET updated_at = ? WHERE id = ?',
    [now(), id],
  );
}
