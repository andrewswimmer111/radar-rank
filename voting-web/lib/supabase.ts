import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const baseOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

// One client per request scope, parameterized by the vote token the request
// is operating under. RLS gates every read + write off this header.
export function withVoteToken(voteToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
    );
  }
  return createClient(url, key, {
    ...baseOptions,
    global: { headers: { 'x-vote-token': voteToken } },
  });
}
