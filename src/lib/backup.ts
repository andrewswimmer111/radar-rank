import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/db';
import * as collectionsDb from '@/db/collections';
import type { Collection } from '@/db/collections';
import * as evaluationsDb from '@/db/evaluations';
import type { Evaluation } from '@/db/evaluations';
import * as evaluationCategoriesDb from '@/db/evaluationCategories';
import type { EvaluationCategory } from '@/db/evaluationCategories';
import * as participantsDb from '@/db/participants';
import type { Participant } from '@/db/participants';
import * as peopleDb from '@/db/people';
import type { Person } from '@/db/people';
import * as scoresDb from '@/db/scores';
import type { Score } from '@/db/scores';
import * as templatesDb from '@/db/templates';
import type { Template } from '@/db/templates';
import * as templateCategoriesDb from '@/db/templateCategories';
import type { TemplateCategory } from '@/db/templateCategories';

// Versioned, portable snapshot of all *user-owned* data. Built-in templates
// re-seed from code, and cloud share/vote state regenerates on re-share, so
// neither is included. `version` gates forward-compatible restore (plan-5).
export type BackupV1 = {
  version: 1;
  exportedAt: number;
  collections: Collection[];
  people: Person[];
  customTemplates: Template[];
  templateCategories: TemplateCategory[];
  evaluations: Evaluation[];
  participants: Participant[];
  evaluationCategories: EvaluationCategory[];
  scores: Score[];
};

export async function serializeBackup(): Promise<BackupV1> {
  const [
    collections,
    people,
    allTemplates,
    allTemplateCategories,
    evaluations,
    participants,
    evaluationCategories,
    scores,
  ] = await Promise.all([
    collectionsDb.listAllCollections(),
    peopleDb.listAllPeople(),
    templatesDb.listTemplates(),
    templateCategoriesDb.listAllTemplateCategories(),
    evaluationsDb.listEvaluations(),
    participantsDb.listAllParticipants(),
    evaluationCategoriesDb.listAllEvaluationCategories(),
    scoresDb.listAllScores(),
  ]);

  const customTemplates = allTemplates.filter((t) => !t.isBuiltin);
  const customIds = new Set(customTemplates.map((t) => t.id));
  const templateCategories = allTemplateCategories.filter((c) =>
    customIds.has(c.templateId),
  );

  return {
    version: 1,
    exportedAt: Date.now(),
    collections,
    people,
    customTemplates,
    templateCategories,
    evaluations,
    participants,
    evaluationCategories,
    scores,
  };
}

function backupFilename(): string {
  return `radarrank-backup-${Date.now()}.json`;
}

// Serializes a backup to a cache file and hands it to the system share sheet
// (Files, AirDrop, Mail, …). Throws if sharing isn't available so the caller
// can surface a clear message.
export async function exportBackupToFile(): Promise<void> {
  const backup = await serializeBackup();
  const json = JSON.stringify(backup, null, 2);

  const file = new File(Paths.cache, backupFilename());
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is unavailable on this device.');

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export RadarRank backup',
  });
}

const BACKUP_ARRAY_KEYS = [
  'collections',
  'people',
  'customTemplates',
  'templateCategories',
  'evaluations',
  'participants',
  'evaluationCategories',
  'scores',
] as const;

// Parses + shape-validates untrusted file contents. Throws a user-facing
// message on bad JSON, an unsupported version, or missing arrays — callers
// surface it instead of crashing.
export function parseBackup(text: string): BackupV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error("This file isn't a RadarRank backup.");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Unsupported backup version: ${String(obj.version ?? 'unknown')}.`);
  }
  for (const key of BACKUP_ARRAY_KEYS) {
    if (!Array.isArray(obj[key])) {
      throw new Error('This backup file is missing data or is corrupt.');
    }
  }
  return raw as BackupV1;
}

// Opens the system document picker, reads the chosen file, and parses it.
// Returns null if the user cancels.
export async function pickBackupFile(): Promise<BackupV1 | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const text = await new File(asset.uri).text();
  return parseBackup(text);
}

export type RestoreMode = 'merge' | 'replace';

// Writes a backup into the database in one transaction (atomic — a failure
// rolls back). `merge` keeps existing rows (INSERT OR IGNORE by id/PK);
// `replace` wipes user-owned rows first. Built-in templates are preserved in
// both modes: every install seeds the same stable-id built-ins, so they
// already match the source — no re-seed needed, and evaluations referencing
// a built-in still insert cleanly. Ids and timestamps are inserted verbatim
// so `replace` reproduces the source device exactly.
export async function applyBackup(
  backup: BackupV1,
  mode: RestoreMode,
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      // Cascades clear people / participants / categories / scores.
      await db.runAsync('DELETE FROM evaluations');
      await db.runAsync('DELETE FROM collections');
      await db.runAsync('DELETE FROM templates WHERE is_builtin = 0');
    }

    for (const c of backup.collections) {
      await db.runAsync(
        'INSERT OR IGNORE INTO collections (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [c.id, c.name, c.createdAt, c.updatedAt],
      );
    }
    for (const p of backup.people) {
      await db.runAsync(
        'INSERT OR IGNORE INTO people (id, collection_id, name, color, position) VALUES (?, ?, ?, ?, ?)',
        [p.id, p.collectionId, p.name, p.color, p.position],
      );
    }
    for (const t of backup.customTemplates) {
      await db.runAsync(
        `INSERT OR IGNORE INTO templates
          (id, name, blurb, accent_start, accent_end, accent_glow, is_builtin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [t.id, t.name, t.blurb, t.accent.start, t.accent.end, t.accent.glow, t.createdAt, t.updatedAt],
      );
    }
    for (const tc of backup.templateCategories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO template_categories (id, template_id, key, label, hint, position) VALUES (?, ?, ?, ?, ?, ?)',
        [tc.id, tc.templateId, tc.key, tc.label, tc.hint, tc.position],
      );
    }
    for (const e of backup.evaluations) {
      await db.runAsync(
        `INSERT OR IGNORE INTO evaluations
          (id, title, origin_collection_id, origin_template_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [e.id, e.title, e.originCollectionId, e.originTemplateId, e.createdAt, e.updatedAt],
      );
    }
    for (const pt of backup.participants) {
      await db.runAsync(
        `INSERT OR IGNORE INTO evaluation_participants
          (id, evaluation_id, name, color, excluded, position, origin_person_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pt.id, pt.evaluationId, pt.name, pt.color, pt.excluded ? 1 : 0, pt.position, pt.originPersonId],
      );
    }
    for (const ec of backup.evaluationCategories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO evaluation_categories (id, evaluation_id, key, label, hint, position) VALUES (?, ?, ?, ?, ?, ?)',
        [ec.id, ec.evaluationId, ec.key, ec.label, ec.hint, ec.position],
      );
    }
    for (const s of backup.scores) {
      await db.runAsync(
        'INSERT OR IGNORE INTO evaluation_scores (evaluation_id, participant_id, category_key, value) VALUES (?, ?, ?, ?)',
        [s.evaluationId, s.participantId, s.categoryKey, s.value],
      );
    }
  });
}
