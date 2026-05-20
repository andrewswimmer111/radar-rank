import { createEvaluation } from './evaluations';
import { createEvaluationCategory } from './evaluationCategories';
import { getDb } from './index';
import { createParticipant } from './participants';
import type { Person } from './people';
import { upsertScore } from './scores';
import type { TemplateCategory } from './templateCategories';

// Transactionally snapshot a collection × template into a new evaluation.
// Calls raw CRUD (not the pubsub-emitting hook wrappers) so the snapshot
// fires zero invalidations mid-flight; the hooks-layer wrapper publishes
// once at the end.
export async function snapshotEvaluation(input: {
  title: string;
  collectionId: string;
  people: Person[];
  templateId: string;
  categories: TemplateCategory[];
}): Promise<string> {
  const db = await getDb();
  let createdId = '';
  await db.withTransactionAsync(async () => {
    const evalu = await createEvaluation({
      title: input.title,
      originCollectionId: input.collectionId,
      originTemplateId: input.templateId,
    });
    createdId = evalu.id;

    const participantIds: string[] = [];
    for (let i = 0; i < input.people.length; i++) {
      const p = input.people[i];
      const part = await createParticipant({
        evaluationId: evalu.id,
        name: p.name,
        color: p.color,
        originPersonId: p.id,
        position: i,
      });
      participantIds.push(part.id);
    }

    const categoryKeys: string[] = [];
    for (let i = 0; i < input.categories.length; i++) {
      const cat = input.categories[i];
      await createEvaluationCategory({
        evaluationId: evalu.id,
        key: cat.key,
        label: cat.label,
        hint: cat.hint,
        position: i,
      });
      categoryKeys.push(cat.key);
    }

    // Initialize the (participant × category) score grid to 50.
    for (const participantId of participantIds) {
      for (const categoryKey of categoryKeys) {
        await upsertScore({
          evaluationId: evalu.id,
          participantId,
          categoryKey,
          value: 50,
        });
      }
    }
  });
  return createdId;
}
