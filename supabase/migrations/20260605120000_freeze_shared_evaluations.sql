-- "Freeze" semantics for shared evaluations. Unsharing in the app used to
-- delete the cloud row outright; now it stamps frozen_at, which:
--   * lets the snapshot stay readable (so the creator's local consensus
--     cache survives a re-pull and a future resume), and
--   * blocks any further vote submissions.
--
-- Only the view_token holder (creator) can flip frozen_at on or off.

alter table shared_evaluations
  add column frozen_at timestamptz;

create policy "update by view_token" on shared_evaluations for update
  using (view_token = request_header('x-view-token'))
  with check (view_token = request_header('x-view-token'));

-- submit_vote needs to refuse writes against a frozen evaluation. Voter
-- knows only the vote_token, so the function is the right enforcement
-- point — RLS-side we'd have to add a check policy keyed on a join.
create or replace function submit_vote(
  p_voter_name text,
  p_scores jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_token text;
  v_shared_evaluation_id uuid;
  v_frozen_at timestamptz;
  v_submission_id uuid;
  v_score jsonb;
begin
  v_vote_token := nullif(
    current_setting('request.headers', true), ''
  )::json ->> 'x-vote-token';

  if v_vote_token is null or length(v_vote_token) = 0 then
    raise exception 'missing_vote_token' using errcode = 'P0001';
  end if;

  select id, frozen_at
    into v_shared_evaluation_id, v_frozen_at
  from shared_evaluations
  where vote_token = v_vote_token;

  if v_shared_evaluation_id is null then
    raise exception 'invalid_vote_token' using errcode = 'P0001';
  end if;

  if v_frozen_at is not null then
    raise exception 'evaluation_frozen' using errcode = 'P0001';
  end if;

  if length(trim(p_voter_name)) = 0 then
    raise exception 'voter_name_required' using errcode = 'P0001';
  end if;

  insert into vote_submissions (shared_evaluation_id, voter_name)
  values (v_shared_evaluation_id, trim(p_voter_name))
  returning id into v_submission_id;

  for v_score in select * from jsonb_array_elements(p_scores) loop
    insert into vote_scores (
      submission_id,
      participant_local_id,
      category_key,
      value
    )
    values (
      v_submission_id,
      v_score ->> 'participant_local_id',
      v_score ->> 'category_key',
      (v_score ->> 'value')::integer
    );
  end loop;

  return v_submission_id;
end;
$$;
