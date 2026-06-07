-- Owner-side management of submitted votes. The view_token holder
-- (creator) can now rename or delete individual submissions, surfaced as
-- "View voters" in the app. Voter-side RLS is unchanged: voters still
-- submit via the submit_vote RPC and can't see or mutate other rows.
--
-- We deliberately allow UPDATE on the whole vote_submissions row rather
-- than restricting it to voter_name. The owner already controls the
-- evaluation snapshot via view_token; tightening it column-wise here
-- would mean a trigger and offers no real protection.
--
-- Freeze state is intentionally ignored. Pausing voting blocks new
-- voter writes, not owner cleanup of existing submissions.

create policy "delete by view_token" on vote_submissions for delete
  using (exists (
    select 1 from shared_evaluations e
    where e.id = vote_submissions.shared_evaluation_id
      and e.view_token = request_header('x-view-token')
  ));

create policy "update by view_token" on vote_submissions for update
  using (exists (
    select 1 from shared_evaluations e
    where e.id = vote_submissions.shared_evaluation_id
      and e.view_token = request_header('x-view-token')
  ))
  with check (exists (
    select 1 from shared_evaluations e
    where e.id = vote_submissions.shared_evaluation_id
      and e.view_token = request_header('x-view-token')
  ));
