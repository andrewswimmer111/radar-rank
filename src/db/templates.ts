import { getDb } from './index';
import { genId, now } from './util';

export type TemplateAccent = {
  start: string;
  end: string;
  glow: string;
};

export type Template = {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  accent: TemplateAccent;
  isBuiltin: boolean;
  createdAt: number;
  updatedAt: number;
};

type Row = {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  accent_start: string;
  accent_end: string;
  accent_glow: string;
  is_builtin: number;
  created_at: number;
  updated_at: number;
};

function fromRow(r: Row): Template {
  return {
    id: r.id,
    name: r.name,
    blurb: r.blurb,
    emoji: r.emoji,
    accent: {
      start: r.accent_start,
      end: r.accent_end,
      glow: r.accent_glow,
    },
    isBuiltin: r.is_builtin === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type CreateTemplateInput = {
  name: string;
  blurb?: string;
  emoji?: string;
  accent: TemplateAccent;
  isBuiltin?: boolean;
  // Optional override so the built-in seeder can use stable IDs.
  id?: string;
};

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const db = await getDb();
  const id = input.id ?? genId();
  const ts = now();
  const blurb = input.blurb ?? '';
  const emoji = input.emoji ?? '';
  const isBuiltinInt = input.isBuiltin ? 1 : 0;
  await db.runAsync(
    `INSERT INTO templates
      (id, name, blurb, emoji, accent_start, accent_end, accent_glow, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      blurb,
      emoji,
      input.accent.start,
      input.accent.end,
      input.accent.glow,
      isBuiltinInt,
      ts,
      ts,
    ],
  );
  return {
    id,
    name: input.name,
    blurb,
    emoji,
    accent: input.accent,
    isBuiltin: isBuiltinInt === 1,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function updateTemplate(
  id: string,
  patch: Partial<{
    name: string;
    blurb: string;
    emoji: string;
    accent: TemplateAccent;
  }>,
): Promise<void> {
  const existing = await getTemplate(id);
  if (!existing) throw new Error(`Template ${id} not found`);
  if (existing.isBuiltin) throw new Error('Cannot modify built-in template');

  const fields: string[] = [];
  const params: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    params.push(patch.name);
  }
  if (patch.blurb !== undefined) {
    fields.push('blurb = ?');
    params.push(patch.blurb);
  }
  if (patch.emoji !== undefined) {
    fields.push('emoji = ?');
    params.push(patch.emoji);
  }
  if (patch.accent !== undefined) {
    fields.push('accent_start = ?', 'accent_end = ?', 'accent_glow = ?');
    params.push(patch.accent.start, patch.accent.end, patch.accent.glow);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  params.push(now());
  params.push(id);

  const db = await getDb();
  await db.runAsync(
    `UPDATE templates SET ${fields.join(', ')} WHERE id = ?`,
    params,
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  const existing = await getTemplate(id);
  if (!existing) return;
  if (existing.isBuiltin) throw new Error('Cannot delete built-in template');
  const db = await getDb();
  await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}

export async function getTemplate(id: string): Promise<Template | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM templates WHERE id = ?',
    [id],
  );
  return row ? fromRow(row) : null;
}

export async function listTemplates(): Promise<Template[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM templates ORDER BY is_builtin DESC, name ASC',
  );
  return rows.map(fromRow);
}
