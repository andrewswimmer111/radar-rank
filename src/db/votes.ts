import { getDb } from './index';

export type VoteSubmission = {
  id: string;
  evaluationId: string;
  voterName: string;
  submittedAt: number;
};

export type VoteScore = {
  submissionId: string;
  participantId: string;
  categoryKey: string;
  value: number;
};

type SubmissionRow = {
  id: string;
  evaluation_id: string;
  voter_name: string;
  submitted_at: number;
};

type ScoreRow = {
  submission_id: string;
  participant_id: string;
  category_key: string;
  value: number;
};

function fromSubmissionRow(r: SubmissionRow): VoteSubmission {
  return {
    id: r.id,
    evaluationId: r.evaluation_id,
    voterName: r.voter_name,
    submittedAt: r.submitted_at,
  };
}

function fromScoreRow(r: ScoreRow): VoteScore {
  return {
    submissionId: r.submission_id,
    participantId: r.participant_id,
    categoryKey: r.category_key,
    value: r.value,
  };
}

// Cloud is authoritative for vote data, so a pull replaces the entire
// local cache for an evaluation in a single transaction. Avoids drift
// from partially-applied syncs and dedupe logic.
export async function replaceSubmissionsForEvaluation(
  evaluationId: string,
  payload: {
    submission: Omit<VoteSubmission, 'evaluationId'>;
    scores: Omit<VoteScore, 'submissionId'>[];
  }[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM vote_submissions WHERE evaluation_id = ?',
      [evaluationId],
    );
    for (const { submission, scores } of payload) {
      await db.runAsync(
        `INSERT INTO vote_submissions (id, evaluation_id, voter_name, submitted_at)
         VALUES (?, ?, ?, ?)`,
        [submission.id, evaluationId, submission.voterName, submission.submittedAt],
      );
      for (const s of scores) {
        await db.runAsync(
          `INSERT INTO vote_scores (submission_id, participant_id, category_key, value)
           VALUES (?, ?, ?, ?)`,
          [submission.id, s.participantId, s.categoryKey, s.value],
        );
      }
    }
  });
}

export async function listSubmissions(
  evaluationId: string,
): Promise<VoteSubmission[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SubmissionRow>(
    'SELECT * FROM vote_submissions WHERE evaluation_id = ? ORDER BY submitted_at DESC',
    [evaluationId],
  );
  return rows.map(fromSubmissionRow);
}

export async function listScoresForEvaluation(
  evaluationId: string,
): Promise<VoteScore[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ScoreRow>(
    `SELECT vs.* FROM vote_scores vs
     JOIN vote_submissions sub ON sub.id = vs.submission_id
     WHERE sub.evaluation_id = ?`,
    [evaluationId],
  );
  return rows.map(fromScoreRow);
}

export async function countSubmissions(evaluationId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM vote_submissions WHERE evaluation_id = ?',
    [evaluationId],
  );
  return row?.n ?? 0;
}
