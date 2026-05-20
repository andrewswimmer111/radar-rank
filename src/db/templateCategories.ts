import { getDb } from './index';
import { genId } from './util';

export type TemplateCategory = {
  id: string;
  templateId: string;
  key: string;
  label: string;
  hint: string | null;
  position: number;
};

type Row = {
  id: string;
  template_id: string;
  key: string;
  label: string;
  hint: string | null;
  position: number;
};

function fromRow(r: Row): TemplateCategory {
  return {
    id: r.id,
    templateId: r.template_id,
    key: r.key,
    label: r.label,
    hint: r.hint,
    position: r.position,
  };
}

export async function createTemplateCategory(input: {
  templateId: string;
  key: string;
  label: string;
  hint?: string | null;
  position?: number;
  // Optional override so the built-in seeder can use stable IDs.
  id?: string;
}): Promise<TemplateCategory> {
  const db = await getDb();
  const id = input.id ?? genId();
  let position = input.position;
  if (position === undefined) {
    const last = await db.getFirstAsync<{ max_pos: number | null }>(
      'SELECT MAX(position) AS max_pos FROM template_categories WHERE template_id = ?',
      [input.templateId],
    );
    position = (last?.max_pos ?? -1) + 1;
  }
  const hint = input.hint ?? null;
  await db.runAsync(
    'INSERT INTO template_categories (id, template_id, key, label, hint, position) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.templateId, input.key, input.label, hint, position],
  );
  return {
    id,
    templateId: input.templateId,
    key: input.key,
    label: input.label,
    hint,
    position,
  };
}

export async function updateTemplateCategory(
  id: string,
  patch: { key?: string; label?: string; hint?: string | null },
): Promise<void> {
  const fields: string[] = [];
  const params: (string | null)[] = [];
  if (patch.key !== undefined) {
    fields.push('key = ?');
    params.push(patch.key);
  }
  if (patch.label !== undefined) {
    fields.push('label = ?');
    params.push(patch.label);
  }
  if (patch.hint !== undefined) {
    fields.push('hint = ?');
    params.push(patch.hint);
  }
  if (fields.length === 0) return;
  params.push(id);
  const db = await getDb();
  await db.runAsync(
    `UPDATE template_categories SET ${fields.join(', ')} WHERE id = ?`,
    params,
  );
}

export async function deleteTemplateCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM template_categories WHERE id = ?', [id]);
}

export async function listTemplateCategories(
  templateId: string,
): Promise<TemplateCategory[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM template_categories WHERE template_id = ? ORDER BY position ASC',
    [templateId],
  );
  return rows.map(fromRow);
}

export async function reorderTemplateCategories(
  templateId: string,
  orderedIds: string[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        'UPDATE template_categories SET position = ? WHERE id = ? AND template_id = ?',
        [i, orderedIds[i], templateId],
      );
    }
  });
}
