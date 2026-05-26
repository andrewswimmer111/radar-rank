create table shared_evaluations (
    id uuid primary key default gen_random_uuid(),
    local_id text not null,                 -- maps back to local evaluations.id
    owner_install_id text not null,         -- per-install anonymous creator id
    title text not null,
    accent_start text not null,
    accent_end text not null,
    accent_glow text not null,
    view_token text not null unique,        -- creator presents this to read submissions
    vote_token text not null unique,        -- voter presents this to read snapshot + write submissions
    created_at timestamptz not null default now()
  );

  create table shared_participants (
    id uuid primary key default gen_random_uuid(),
    shared_evaluation_id uuid not null references shared_evaluations(id) on delete cascade,
    local_id text not null,                 -- maps back to local evaluation_participants.id
    name text not null,
    color text,
    position integer not null default 0
  );
  create index idx_shared_participants_eval on shared_participants(shared_evaluation_id);

  create table shared_categories (
    id uuid primary key default gen_random_uuid(),
    shared_evaluation_id uuid not null references shared_evaluations(id) on delete cascade,
    key text not null,
    label text not null,
    hint text,
    position integer not null default 0,
    unique (shared_evaluation_id, key)
  );
  create index idx_shared_categories_eval on shared_categories(shared_evaluation_id);

  -- ============================================================
  -- Vote tables: what voters write back.
  -- ============================================================

  create table vote_submissions (
    id uuid primary key default gen_random_uuid(),
    shared_evaluation_id uuid not null references shared_evaluations(id) on delete cascade,
    voter_name text not null,
    submitted_at timestamptz not null default now()
  );
  create index idx_vote_submissions_eval on vote_submissions(shared_evaluation_id);

  create table vote_scores (
    submission_id uuid not null references vote_submissions(id) on delete cascade,
    participant_local_id text not null,     -- matches shared_participants.local_id
    category_key text not null,
    value integer not null check (value between 0 and 100),
    primary key (submission_id, participant_local_id, category_key)
  );

  -- ============================================================
  -- Row Level Security
  -- ============================================================

  alter table shared_evaluations enable row level security;
  alter table shared_participants enable row level security;
  alter table shared_categories enable row level security;
  alter table vote_submissions enable row level security;
  alter table vote_scores enable row level security;

  -- Helper: pull a header value from the PostgREST request context.
  create or replace function request_header(name text) returns text
  language sql stable as $$
    select nullif(current_setting('request.headers', true), '')::json ->> name
  $$;

  -- shared_evaluations: read with either token, insert open (anonymous creators),
  -- delete only with the creator's view_token.
  create policy "read by token" on shared_evaluations for select
    using (view_token = request_header('x-view-token')
        or vote_token = request_header('x-vote-token'));

  create policy "insert open" on shared_evaluations for insert
    with check (true);

  create policy "delete by view_token" on shared_evaluations for delete
    using (view_token = request_header('x-view-token'));

  -- shared_participants & shared_categories: same read rule via parent eval;
  -- insert only with view_token (creator pushing the snapshot).
  create policy "read by parent token" on shared_participants for select
    using (exists (
      select 1 from shared_evaluations e
      where e.id = shared_participants.shared_evaluation_id
        and (e.view_token = request_header('x-view-token')
          or e.vote_token = request_header('x-vote-token'))
    ));

  create policy "insert by view_token" on shared_participants for insert
    with check (exists (
      select 1 from shared_evaluations e
      where e.id = shared_participants.shared_evaluation_id
        and e.view_token = request_header('x-view-token')
    ));

  create policy "read by parent token" on shared_categories for select
    using (exists (
      select 1 from shared_evaluations e
      where e.id = shared_categories.shared_evaluation_id
        and (e.view_token = request_header('x-view-token')
          or e.vote_token = request_header('x-vote-token'))
    ));

  create policy "insert by view_token" on shared_categories for insert
    with check (exists (
      select 1 from shared_evaluations e
      where e.id = shared_categories.shared_evaluation_id
        and e.view_token = request_header('x-view-token')
    ));

  -- vote_submissions: creator reads with view_token; voter inserts with vote_token.
  create policy "read by view_token" on vote_submissions for select
    using (exists (
      select 1 from shared_evaluations e
      where e.id = vote_submissions.shared_evaluation_id
        and e.view_token = request_header('x-view-token')
    ));

  create policy "insert by vote_token" on vote_submissions for insert
    with check (exists (
      select 1 from shared_evaluations e
      where e.id = vote_submissions.shared_evaluation_id
        and e.vote_token = request_header('x-vote-token')
    ));

  -- vote_scores: same rules, walked through vote_submissions.
  create policy "read by view_token" on vote_scores for select
    using (exists (
      select 1 from vote_submissions vs
      join shared_evaluations e on e.id = vs.shared_evaluation_id
      where vs.id = vote_scores.submission_id
        and e.view_token = request_header('x-view-token')
    ));

  create policy "insert by vote_token" on vote_scores for insert
    with check (exists (
      select 1 from vote_submissions vs
      join shared_evaluations e on e.id = vs.shared_evaluation_id
      where vs.id = vote_scores.submission_id
        and e.vote_token = request_header('x-vote-token')
    ));