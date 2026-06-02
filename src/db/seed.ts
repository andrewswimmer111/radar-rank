import { BUILTIN_TEMPLATES } from '@/data/builtinTemplates';

import { getDb } from './index';
import { createTemplate } from './templates';
import { createTemplateCategory } from './templateCategories';
import { now } from './util';

// Stable category ID derived from the template + key, so reinstalls
// produce identical rows and any future migration can target known IDs.
function categoryId(templateId: string, key: string): string {
  return `${templateId}-${key}`;
}

// Stable IDs prefixed with `builtin-` so the UI can distinguish them
// from user-created rows without a schema column.
const STARTER_COLLECTION_ID = 'builtin-starter-collection';
const STARTER_EVALUATION_ID = 'builtin-starter-evaluation';
const STARTER_PEOPLE = ['Alex', 'Sam', 'Jordan', 'Taylor'];

// Run on every app launch. Each step is independently idempotent so
// adding or removing a built-in shows up on existing installs without
// a migration.
export async function seedBuiltinsIfNeeded(): Promise<void> {
  await syncBuiltinTemplates();
  await seedStarterCollectionIfMissing();
  await seedStarterEvaluationIfMissing();
}

async function syncBuiltinTemplates(): Promise<void> {
  const db = await getDb();
  const wantIds = new Set(BUILTIN_TEMPLATES.map((t) => t.id));

  // Drop any built-in templates that have been removed from code.
  // Their cascade clears template_categories; evaluations that pointed
  // at them keep their snapshotted categories (origin_template_id → NULL).
  const existing = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM templates WHERE is_builtin = 1',
  );
  const existingIds = new Set(existing.map((r) => r.id));
  for (const id of existingIds) {
    if (!wantIds.has(id)) {
      await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
    }
  }

  for (const tmpl of BUILTIN_TEMPLATES) {
    if (existingIds.has(tmpl.id)) continue;
    await createTemplate({
      id: tmpl.id,
      name: tmpl.name,
      blurb: tmpl.blurb,
      accent: tmpl.accent,
      isBuiltin: true,
    });
    for (let i = 0; i < tmpl.categories.length; i++) {
      const c = tmpl.categories[i];
      await createTemplateCategory({
        id: categoryId(tmpl.id, c.key),
        templateId: tmpl.id,
        key: c.key,
        label: c.label,
        position: i,
      });
    }
  }
}

async function seedStarterCollectionIfMissing(): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM collections WHERE id = ?',
    [STARTER_COLLECTION_ID],
  );
  if (existing) return;

  const ts = now();
  await db.runAsync(
    'INSERT INTO collections (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [STARTER_COLLECTION_ID, 'Sample Crew', ts, ts],
  );
  for (let i = 0; i < STARTER_PEOPLE.length; i++) {
    await db.runAsync(
      'INSERT INTO people (id, collection_id, name, color, position) VALUES (?, ?, ?, NULL, ?)',
      [
        `${STARTER_COLLECTION_ID}-person-${i}`,
        STARTER_COLLECTION_ID,
        STARTER_PEOPLE[i],
        i,
      ],
    );
  }
}

async function seedStarterEvaluationIfMissing(): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM evaluations WHERE id = ?',
    [STARTER_EVALUATION_ID],
  );
  if (existing) return;
  if (BUILTIN_TEMPLATES.length === 0) return;

  const seedTemplate = BUILTIN_TEMPLATES[0];
  const ts = now();
  await db.runAsync(
    `INSERT INTO evaluations
      (id, title, origin_collection_id, origin_template_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      STARTER_EVALUATION_ID,
      'Sample Evaluation',
      STARTER_COLLECTION_ID,
      seedTemplate.id,
      ts,
      ts,
    ],
  );
  const participantIds: string[] = [];
  for (let i = 0; i < STARTER_PEOPLE.length; i++) {
    const partId = `${STARTER_EVALUATION_ID}-participant-${i}`;
    participantIds.push(partId);
    await db.runAsync(
      `INSERT INTO evaluation_participants
        (id, evaluation_id, name, color, excluded, position, origin_person_id)
       VALUES (?, ?, ?, NULL, 0, ?, ?)`,
      [
        partId,
        STARTER_EVALUATION_ID,
        STARTER_PEOPLE[i],
        i,
        `${STARTER_COLLECTION_ID}-person-${i}`,
      ],
    );
  }
  for (let i = 0; i < seedTemplate.categories.length; i++) {
    const c = seedTemplate.categories[i];
    await db.runAsync(
      'INSERT INTO evaluation_categories (id, evaluation_id, key, label, hint, position) VALUES (?, ?, ?, ?, NULL, ?)',
      [
        `${STARTER_EVALUATION_ID}-cat-${c.key}`,
        STARTER_EVALUATION_ID,
        c.key,
        c.label,
        i,
      ],
    );
  }
  for (const partId of participantIds) {
    for (const c of seedTemplate.categories) {
      await db.runAsync(
        'INSERT INTO evaluation_scores (evaluation_id, participant_id, category_key, value) VALUES (?, ?, ?, 50)',
        [STARTER_EVALUATION_ID, partId, c.key],
      );
    }
  }
}
