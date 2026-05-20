import { getDb } from './index';

export type Score = {
  evaluationId: string;
  participantId: string;
  categoryKey: string;
  value: number;
};

type Row = {
  evaluation_id: string;
  participant_id: string;
  category_key: string;
  value: number;
};

function fromRow(r: Row): Score {
  return {
    evaluationId: r.evaluation_id,
    participantId: r.participant_id,
    categoryKey: r.category_key,
    value: r.value,
  };
}

export async function upsertScore(input: Score): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO evaluation_scores
      (evaluation_id, participant_id, category_key, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (evaluation_id, participant_id, category_key)
     DO UPDATE SET value = excluded.value`,
    [input.evaluationId, input.participantId, input.categoryKey, input.value],
  );
}

export async function listScoresForEvaluation(
  evaluationId: string,
): Promise<Score[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM evaluation_scores WHERE evaluation_id = ?',
    [evaluationId],
  );
  return rows.map(fromRow);
}
