import { getDb } from './index';
import { genId } from './util';

export type EvaluationCategory = {
  id: string;
  evaluationId: string;
  key: string;
  label: string;
  hint: string | null;
  position: number;
};

type Row = {
  id: string;
  evaluation_id: string;
  key: string;
  label: string;
  hint: string | null;
  position: number;
};

function fromRow(r: Row): EvaluationCategory {
  return {
    id: r.id,
    evaluationId: r.evaluation_id,
    key: r.key,
    label: r.label,
    hint: r.hint,
    position: r.position,
  };
}

export async function createEvaluationCategory(input: {
  evaluationId: string;
  key: string;
  label: string;
  hint?: string | null;
  position: number;
}): Promise<EvaluationCategory> {
  const db = await getDb();
  const id = genId();
  const hint = input.hint ?? null;
  await db.runAsync(
    'INSERT INTO evaluation_categories (id, evaluation_id, key, label, hint, position) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.evaluationId, input.key, input.label, hint, input.position],
  );
  return {
    id,
    evaluationId: input.evaluationId,
    key: input.key,
    label: input.label,
    hint,
    position: input.position,
  };
}

export async function listEvaluationCategories(
  evaluationId: string,
): Promise<EvaluationCategory[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM evaluation_categories WHERE evaluation_id = ? ORDER BY position ASC',
    [evaluationId],
  );
  return rows.map(fromRow);
}
