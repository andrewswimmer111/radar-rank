import { getDb } from './index';
import { genId } from './util';

export type Person = {
  id: string;
  collectionId: string;
  name: string;
  color: string | null;
  position: number;
};

type Row = {
  id: string;
  collection_id: string;
  name: string;
  color: string | null;
  position: number;
};

function fromRow(r: Row): Person {
  return {
    id: r.id,
    collectionId: r.collection_id,
    name: r.name,
    color: r.color,
    position: r.position,
  };
}

export async function createPerson(input: {
  collectionId: string;
  name: string;
  color?: string | null;
}): Promise<Person> {
  const db = await getDb();
  const id = genId();
  const last = await db.getFirstAsync<{ max_pos: number | null }>(
    'SELECT MAX(position) AS max_pos FROM people WHERE collection_id = ?',
    [input.collectionId],
  );
  const position = (last?.max_pos ?? -1) + 1;
  const color = input.color ?? null;
  await db.runAsync(
    'INSERT INTO people (id, collection_id, name, color, position) VALUES (?, ?, ?, ?, ?)',
    [id, input.collectionId, input.name, color, position],
  );
  return {
    id,
    collectionId: input.collectionId,
    name: input.name,
    color,
    position,
  };
}

export async function updatePerson(
  id: string,
  patch: { name?: string; color?: string | null },
): Promise<void> {
  const fields: string[] = [];
  const params: (string | null)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    params.push(patch.name);
  }
  if (patch.color !== undefined) {
    fields.push('color = ?');
    params.push(patch.color);
  }
  if (fields.length === 0) return;
  params.push(id);
  const db = await getDb();
  await db.runAsync(
    `UPDATE people SET ${fields.join(', ')} WHERE id = ?`,
    params,
  );
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM people WHERE id = ?', [id]);
}

export async function listAllPeople(): Promise<Person[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM people');
  return rows.map(fromRow);
}

export async function listPeopleForCollection(
  collectionId: string,
): Promise<Person[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM people WHERE collection_id = ? ORDER BY position ASC, name ASC',
    [collectionId],
  );
  return rows.map(fromRow);
}

export async function reorderPeople(
  collectionId: string,
  orderedIds: string[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        'UPDATE people SET position = ? WHERE id = ? AND collection_id = ?',
        [i, orderedIds[i], collectionId],
      );
    }
  });
}
