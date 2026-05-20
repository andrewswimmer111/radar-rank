import { getDb } from './index';
import { genId } from './util';

export type Participant = {
  id: string;
  evaluationId: string;
  name: string;
  color: string | null;
  excluded: boolean;
  position: number;
  originPersonId: string | null;
};

type Row = {
  id: string;
  evaluation_id: string;
  name: string;
  color: string | null;
  excluded: number;
  position: number;
  origin_person_id: string | null;
};

function fromRow(r: Row): Participant {
  return {
    id: r.id,
    evaluationId: r.evaluation_id,
    name: r.name,
    color: r.color,
    excluded: r.excluded === 1,
    position: r.position,
    originPersonId: r.origin_person_id,
  };
}

export async function createParticipant(input: {
  evaluationId: string;
  name: string;
  color?: string | null;
  originPersonId?: string | null;
  position?: number;
}): Promise<Participant> {
  const db = await getDb();
  const id = genId();
  let position = input.position;
  if (position === undefined) {
    const last = await db.getFirstAsync<{ max_pos: number | null }>(
      'SELECT MAX(position) AS max_pos FROM evaluation_participants WHERE evaluation_id = ?',
      [input.evaluationId],
    );
    position = (last?.max_pos ?? -1) + 1;
  }
  const color = input.color ?? null;
  const originPersonId = input.originPersonId ?? null;
  await db.runAsync(
    `INSERT INTO evaluation_participants
      (id, evaluation_id, name, color, excluded, position, origin_person_id)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [id, input.evaluationId, input.name, color, position, originPersonId],
  );
  return {
    id,
    evaluationId: input.evaluationId,
    name: input.name,
    color,
    excluded: false,
    position,
    originPersonId,
  };
}

export async function updateParticipant(
  id: string,
  patch: { name?: string; color?: string | null; excluded?: boolean },
): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    params.push(patch.name);
  }
  if (patch.color !== undefined) {
    fields.push('color = ?');
    params.push(patch.color);
  }
  if (patch.excluded !== undefined) {
    fields.push('excluded = ?');
    params.push(patch.excluded ? 1 : 0);
  }
  if (fields.length === 0) return;
  params.push(id);
  const db = await getDb();
  await db.runAsync(
    `UPDATE evaluation_participants SET ${fields.join(', ')} WHERE id = ?`,
    params,
  );
}

export async function deleteParticipant(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM evaluation_participants WHERE id = ?', [id]);
}

export async function listParticipants(
  evaluationId: string,
): Promise<Participant[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM evaluation_participants WHERE evaluation_id = ? ORDER BY position ASC, name ASC',
    [evaluationId],
  );
  return rows.map(fromRow);
}
