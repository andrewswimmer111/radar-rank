# RadarRank — Voting Web

Standalone Next.js app for the share-link voting flow. Renders an evaluation
snapshot from Supabase via `vote_token`, lets a voter score every
participant × category combo, and submits all scores atomically via the
`submit_vote` RPC.

This app is independent of the React Native app — separate `package.json`,
deployed separately, separate env config.

## Setup

```bash
cd voting-web
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

These are the same values as the main app's `.env`, just with the
`NEXT_PUBLIC_` prefix Next.js requires for client-exposed env vars.

## Apply the `submit_vote` RPC migration

The voting form depends on a Postgres function that doesn't ship with
plan-1's initial schema. From the **repo root** (not voting-web):

```bash
supabase db push
```

This applies `supabase/migrations/<ts>_submit_vote_rpc.sql` to the linked
project. Verify it landed:

```sql
-- run in dashboard SQL editor
select exists (select 1 from pg_proc where proname = 'submit_vote');
-- expect: true
```

## Local development

```bash
npm run dev
```

Open <http://localhost:3000>. To test the voting flow:

1. In the main RadarRank iOS app, share an evaluation. Copy the URL.
2. Replace the host with `http://localhost:3000` — keep the
   `/v/<voteToken>` path.
3. Open in a browser. Score and submit.
4. Check `vote_submissions` / `vote_scores` in the Supabase dashboard.

## Deploying to Vercel

1. Create a new Vercel project pointing at this repo.
2. Set the **Root Directory** to `voting-web` (Vercel will auto-detect
   Next.js).
3. Add the two `NEXT_PUBLIC_*` env vars in the Vercel project settings.
4. Deploy.

The share URL host (`https://radarrank.app/v/...` in
`src/app/evaluation/[id]/index.tsx`) is a placeholder. Once Vercel assigns
a domain (e.g. `radarrank-vote.vercel.app`), update `VOTE_URL_BASE` in
that file to match.

## How submission works

The form gathers `voter_name` and an array of
`{ participant_local_id, category_key, value }`. On submit it calls
`supabase.rpc('submit_vote', { p_voter_name, p_scores })` with the
`x-vote-token` header set. The RPC:

1. Reads `x-vote-token` from the request header
2. Resolves the `shared_evaluation_id` from it (rejects if no match)
3. Inserts one `vote_submissions` row
4. Inserts N `vote_scores` rows
5. Returns the new submission's UUID

The function is `SECURITY DEFINER` to bypass the RLS read-policy gotcha
on `RETURNING` (the SELECT policy on `vote_submissions` keys off
`x-view-token`, which the voter doesn't have). Safety lives in the
function's own token check, not RLS, for this code path.
