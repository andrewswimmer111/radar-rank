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
const STARTER_COLLECTION_ID = 'builtin-brainrot-collection';
const STARTER_EVALUATION_ID = 'builtin-brainrot-athleticism';
const STARTER_PEOPLE: { key: string; name: string }[] = [
  { key: 'tung', name: 'Tung Tung Tung Sahur' },
  { key: 'chad', name: 'Chad' },
  { key: 'chungus', name: 'Big Chungus' },
];

// Prior starter IDs from earlier releases. Kept here so upgrades sweep the
// stale rows before the new starters seed — otherwise the user would see
// both sets side-by-side under the "Starters" section.
const LEGACY_STARTER_COLLECTION_IDS = ['builtin-starter-collection'];
const LEGACY_STARTER_EVALUATION_IDS = ['builtin-starter-evaluation'];

// Sentinel values on the starter's evaluation_shares row. Never sent to
// Supabase — the evaluation UI checks id.startsWith('builtin-') and hides
// share-management actions accordingly. `frozen_at` is non-null so the
// mount-time refresh loop skips its cloud pull.
const STARTER_SHARE_CLOUD_ID = 'starter-local-cloud-id';
const STARTER_SHARE_VIEW_TOKEN = 'starter-local-view-token';
const STARTER_SHARE_VOTE_TOKEN = 'starter-local-vote-token';
const STARTER_SHARE_OWNER_INSTALL_ID = 'starter-local-owner';

// Fake voter names (kept generic so the starter's demo intent is obvious
// to a new user). Per-category scores below are hand-picked to give each
// participant a distinct specialty while keeping the group averages
// interesting — no two voters agree perfectly, so the "vs avg" chip on
// the voters list shows non-zero deviation for everyone.
type StarterVote = {
  voter: string;
  // Row order matches STARTER_PEOPLE; column order matches the template's
  // categories in builtinTemplates.ts (swim_100yd, dash_100m, run_5k,
  // basketball, tennis).
  scores: number[][];
};

const STARTER_VOTES: StarterVote[] = [
  {
    voter: 'starter1',
    scores: [
      // Tung Tung Tung Sahur — twitchy sprinter, gassed at distance.
      [58, 88, 32, 46, 62],
      // Chad — well-rounded high scorer.
      [76, 82, 74, 88, 80],
      // Big Chungus — heavy hitter in the pool, walking to the 5k.
      [90, 40, 18, 62, 28],
    ],
  },
  {
    voter: 'starter2',
    scores: [
      [64, 84, 28, 52, 66],
      [72, 78, 80, 92, 74],
      [86, 44, 22, 58, 32],
    ],
  },
  {
    voter: 'starter3',
    scores: [
      [54, 92, 36, 42, 58],
      [80, 86, 70, 84, 88],
      [94, 36, 14, 66, 24],
    ],
  },
  {
    voter: 'starter4',
    scores: [
      [60, 90, 30, 48, 60],
      [74, 80, 78, 90, 76],
      [92, 42, 20, 60, 30],
    ],
  },
  {
    voter: 'starter5',
    scores: [
      [56, 86, 34, 44, 64],
      [78, 84, 72, 86, 82],
      [88, 38, 16, 64, 26],
    ],
  },
];

// Run on every app launch. Each step is independently idempotent so
// adding or removing a built-in shows up on existing installs without
// a migration.
export async function seedBuiltinsIfNeeded(): Promise<void> {
  await sweepLegacyStarters();
  await syncBuiltinTemplates();
  await seedStarterCollectionIfMissing();
  await seedStarterEvaluationIfMissing();
}

// Drop starter rows from prior releases. Cascade wipes their people,
// participants, categories, scores, share row, and vote data.
async function sweepLegacyStarters(): Promise<void> {
  const db = await getDb();
  for (const id of LEGACY_STARTER_EVALUATION_IDS) {
    await db.runAsync('DELETE FROM evaluations WHERE id = ?', [id]);
  }
  for (const id of LEGACY_STARTER_COLLECTION_IDS) {
    await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
  }
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

  // Resync builtins on every launch: template metadata + full category
  // list are overwritten from code. This is what lets an old install pick
  // up label / accent / category changes without a schema migration.
  // Preserves the template row itself (and thus origin_template_id
  // lineage on any evaluation snapshotted from it).
  for (const tmpl of BUILTIN_TEMPLATES) {
    const ts = now();
    if (existingIds.has(tmpl.id)) {
      await db.runAsync(
        `UPDATE templates
           SET name = ?, blurb = ?, accent_start = ?, accent_end = ?,
               accent_glow = ?, updated_at = ?
         WHERE id = ?`,
        [
          tmpl.name,
          tmpl.blurb,
          tmpl.accent.start,
          tmpl.accent.end,
          tmpl.accent.glow,
          ts,
          tmpl.id,
        ],
      );
      await db.runAsync('DELETE FROM template_categories WHERE template_id = ?', [
        tmpl.id,
      ]);
    } else {
      await createTemplate({
        id: tmpl.id,
        name: tmpl.name,
        blurb: tmpl.blurb,
        accent: tmpl.accent,
        isBuiltin: true,
      });
    }
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
    [STARTER_COLLECTION_ID, 'Brainrot', ts, ts],
  );
  for (let i = 0; i < STARTER_PEOPLE.length; i++) {
    const p = STARTER_PEOPLE[i];
    await db.runAsync(
      'INSERT INTO people (id, collection_id, name, color, position) VALUES (?, ?, ?, NULL, ?)',
      [`${STARTER_COLLECTION_ID}-person-${p.key}`, STARTER_COLLECTION_ID, p.name, i],
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
      'Brainrot Combine',
      STARTER_COLLECTION_ID,
      seedTemplate.id,
      ts,
      ts,
    ],
  );
  const participantIds: string[] = [];
  for (let i = 0; i < STARTER_PEOPLE.length; i++) {
    const p = STARTER_PEOPLE[i];
    const partId = `${STARTER_EVALUATION_ID}-participant-${p.key}`;
    participantIds.push(partId);
    await db.runAsync(
      `INSERT INTO evaluation_participants
        (id, evaluation_id, name, color, excluded, position, origin_person_id)
       VALUES (?, ?, ?, NULL, 0, ?, ?)`,
      [
        partId,
        STARTER_EVALUATION_ID,
        p.name,
        i,
        `${STARTER_COLLECTION_ID}-person-${p.key}`,
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
  // Owner-side "your" scores: the mean of the fake voters, so the yours
  // tab and consensus tab open with numbers in the same ballpark.
  const cats = seedTemplate.categories;
  for (let pi = 0; pi < participantIds.length; pi++) {
    for (let ci = 0; ci < cats.length; ci++) {
      const values = STARTER_VOTES.map((v) => v.scores[pi][ci]);
      const mean = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      await db.runAsync(
        'INSERT INTO evaluation_scores (evaluation_id, participant_id, category_key, value) VALUES (?, ?, ?, ?)',
        [STARTER_EVALUATION_ID, participantIds[pi], cats[ci].key, mean],
      );
    }
  }

  // Fake "shared" state so the consensus tab + voters list have vote
  // rows to render. The cloud_id/tokens are sentinels — never sent to
  // Supabase — and `frozen_at` is set so the mount-time cloud pull in
  // evaluation/[id]/index.tsx skips (isActive requires !frozen). The
  // evaluation screen also hides all share-management actions for
  // starters (id.startsWith('builtin-')).
  await db.runAsync(
    `INSERT INTO evaluation_shares
      (evaluation_id, cloud_id, view_token, vote_token, owner_install_id, shared_at, last_pulled_at, frozen_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      STARTER_EVALUATION_ID,
      STARTER_SHARE_CLOUD_ID,
      STARTER_SHARE_VIEW_TOKEN,
      STARTER_SHARE_VOTE_TOKEN,
      STARTER_SHARE_OWNER_INSTALL_ID,
      ts,
      ts,
    ],
  );

  for (let vi = 0; vi < STARTER_VOTES.length; vi++) {
    const vote = STARTER_VOTES[vi];
    const submissionId = `${STARTER_EVALUATION_ID}-submission-${vi + 1}`;
    // Stagger submitted_at so the voters list shows a plausible timeline
    // (starter1 is oldest, starter5 is newest). One hour between each.
    const submittedAt = ts - (STARTER_VOTES.length - vi - 1) * 60 * 60 * 1000;
    await db.runAsync(
      'INSERT INTO vote_submissions (id, evaluation_id, voter_name, submitted_at) VALUES (?, ?, ?, ?)',
      [submissionId, STARTER_EVALUATION_ID, vote.voter, submittedAt],
    );
    for (let pi = 0; pi < participantIds.length; pi++) {
      for (let ci = 0; ci < cats.length; ci++) {
        await db.runAsync(
          'INSERT INTO vote_scores (submission_id, participant_id, category_key, value) VALUES (?, ?, ?, ?)',
          [submissionId, participantIds[pi], cats[ci].key, vote.scores[pi][ci]],
        );
      }
    }
  }
}
