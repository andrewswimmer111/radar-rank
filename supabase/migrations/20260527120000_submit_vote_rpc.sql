-- Atomic vote submission. The voter web form calls this via RPC instead of
-- raw inserts so the submission row + N score rows live or die together.
--
-- Why SECURITY DEFINER: PostgREST inserts with RLS run a SELECT against the
-- new row's SELECT policy, which would fail here because the voter only
-- holds an x-vote-token (the SELECT policy keys on x-view-token). Running
-- as definer bypasses RLS — safe because the function reads x-vote-token
-- from the request header and validates it against shared_evaluations
-- itself before doing anything else.
--
-- search_path is pinned to avoid schema-injection attacks via the function
-- owner's privileges.

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
  v_submission_id uuid;
  v_score jsonb;
begin
  v_vote_token := nullif(
    current_setting('request.headers', true), ''
  )::json ->> 'x-vote-token';

  if v_vote_token is null or length(v_vote_token) = 0 then
    raise exception 'missing_vote_token' using errcode = 'P0001';
  end if;

  select id into v_shared_evaluation_id
  from shared_evaluations
  where vote_token = v_vote_token;

  if v_shared_evaluation_id is null then
    raise exception 'invalid_vote_token' using errcode = 'P0001';
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

grant execute on function submit_vote(text, jsonb) to anon, authenticated;
