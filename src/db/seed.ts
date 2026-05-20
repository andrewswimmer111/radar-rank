import { BUILTIN_TEMPLATES } from '@/data/builtinTemplates';

import { getDb } from './index';
import { createTemplate } from './templates';
import { createTemplateCategory } from './templateCategories';

// Stable category ID derived from the template + key, so reinstalls
// produce identical rows and any future migration can target known IDs.
function categoryId(templateId: string, key: string): string {
  return `${templateId}-${key}`;
}

export async function seedBuiltinsIfNeeded(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM templates WHERE is_builtin = 1',
  );
  if ((row?.cnt ?? 0) > 0) return;

  for (const tmpl of BUILTIN_TEMPLATES) {
    await createTemplate({
      id: tmpl.id,
      name: tmpl.name,
      blurb: tmpl.blurb,
      emoji: tmpl.emoji,
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

  console.log(`[db] seeded ${BUILTIN_TEMPLATES.length} built-in templates`);
}
