import { getDb } from './index';
import { genId, now } from './util';

export type Collection = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type CollectionWithCount = Collection & { peopleCount: number };

type Row = {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
};

type RowWithCount = Row & { people_count: number };

function fromRow(r: Row): Collection {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createCollection(input: { name: string }): Promise<Collection> {
  const db = await getDb();
  const id = genId();
  const ts = now();
  await db.runAsync(
    'INSERT INTO collections (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, input.name, ts, ts],
  );
  return { id, name: input.name, createdAt: ts, updatedAt: ts };
}

export async function updateCollection(
  id: string,
  patch: { name: string },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE collections SET name = ?, updated_at = ? WHERE id = ?',
    [patch.name, now(), id],
  );
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM collections WHERE id = ?',
    [id],
  );
  return row ? fromRow(row) : null;
}

export async function listCollections(): Promise<CollectionWithCount[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RowWithCount>(`
    SELECT c.*, COALESCE(p.cnt, 0) AS people_count
    FROM collections c
    LEFT JOIN (
      SELECT collection_id, COUNT(*) AS cnt FROM people GROUP BY collection_id
    ) p ON p.collection_id = c.id
    ORDER BY c.updated_at DESC
  `);
  return rows.map((r) => ({ ...fromRow(r), peopleCount: r.people_count }));
}
