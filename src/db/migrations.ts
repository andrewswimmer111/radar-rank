import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const v1: Migration = {
  version: 1,
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE collections (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE people (
        id TEXT PRIMARY KEY NOT NULL,
        collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_people_collection_id ON people(collection_id);

      CREATE TABLE templates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        blurb TEXT NOT NULL DEFAULT '',
        emoji TEXT NOT NULL DEFAULT '',
        accent_start TEXT NOT NULL,
        accent_end TEXT NOT NULL,
        accent_glow TEXT NOT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE template_categories (
        id TEXT PRIMARY KEY NOT NULL,
        template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        hint TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        UNIQUE (template_id, key)
      );
      CREATE INDEX idx_template_categories_template_id ON template_categories(template_id);

      CREATE TABLE evaluations (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        origin_collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
        origin_template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE evaluation_participants (
        id TEXT PRIMARY KEY NOT NULL,
        evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        excluded INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        origin_person_id TEXT REFERENCES people(id) ON DELETE SET NULL
      );
      CREATE INDEX idx_evaluation_participants_evaluation_id
        ON evaluation_participants(evaluation_id);

      CREATE TABLE evaluation_categories (
        id TEXT PRIMARY KEY NOT NULL,
        evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        hint TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        UNIQUE (evaluation_id, key)
      );
      CREATE INDEX idx_evaluation_categories_evaluation_id
        ON evaluation_categories(evaluation_id);

      CREATE TABLE evaluation_scores (
        evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL REFERENCES evaluation_participants(id) ON DELETE CASCADE,
        category_key TEXT NOT NULL,
        value INTEGER NOT NULL,
        PRIMARY KEY (evaluation_id, participant_id, category_key)
      );
      CREATE INDEX idx_evaluation_scores_evaluation_id ON evaluation_scores(evaluation_id);
    `);
  },
};

const v2: Migration = {
  version: 2,
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE evaluation_shares (
        evaluation_id TEXT PRIMARY KEY NOT NULL
          REFERENCES evaluations(id) ON DELETE CASCADE,
        cloud_id TEXT NOT NULL,
        view_token TEXT NOT NULL,
        vote_token TEXT NOT NULL,
        owner_install_id TEXT NOT NULL,
        shared_at INTEGER NOT NULL,
        last_pulled_at INTEGER
      );

      CREATE TABLE vote_submissions (
        id TEXT PRIMARY KEY NOT NULL,
        evaluation_id TEXT NOT NULL
          REFERENCES evaluation_shares(evaluation_id) ON DELETE CASCADE,
        voter_name TEXT NOT NULL,
        submitted_at INTEGER NOT NULL
      );
      CREATE INDEX idx_vote_submissions_evaluation_id
        ON vote_submissions(evaluation_id);

      CREATE TABLE vote_scores (
        submission_id TEXT NOT NULL
          REFERENCES vote_submissions(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL,
        category_key TEXT NOT NULL,
        value INTEGER NOT NULL CHECK (value BETWEEN 0 AND 100),
        PRIMARY KEY (submission_id, participant_id, category_key)
      );
    `);
  },
};

const v3: Migration = {
  version: 3,
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE app_state (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },
};

// Mirrors the cloud-side frozen_at column added in the same release. A
// "frozen" share keeps every local row (share + cached submissions +
// scores) so the consensus tab survives an unshare; cloud-side the
// row is preserved too so resuming reactivates the same vote link.
const v4: Migration = {
  version: 4,
  up: async (db) => {
    await db.execAsync(
      'ALTER TABLE evaluation_shares ADD COLUMN frozen_at INTEGER',
    );
  },
};

const MIGRATIONS: Migration[] = [v1, v2, v3, v4];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= currentVersion) continue;
    await db.withTransactionAsync(async () => {
      await m.up(db);
      // PRAGMA user_version doesn't accept bind parameters.
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
  }
}
