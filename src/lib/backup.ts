import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
