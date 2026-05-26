import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!URL || !KEY) {
  throw new Error(
    'Supabase env not configured: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.',
  );
}

// Fresh client per request when token headers are needed. Cloud is read-only
// for most flows, so a header-less default client covers the simple cases;
// `withViewToken` / `withVoteToken` build short-lived clients for the
// token-scoped reads + writes that RLS gates.
//
// Auth session persistence is disabled — we don't use Supabase auth, and
// the default storage adapter pulls in AsyncStorage which isn't installed.

const baseOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

export function getSupabase(): SupabaseClient {
  return createClient(URL!, KEY!, baseOptions);
}

export function withViewToken(viewToken: string): SupabaseClient {
  return createClient(URL!, KEY!, {
    ...baseOptions,
    global: { headers: { 'x-view-token': viewToken } },
  });
}

export function withVoteToken(voteToken: string): SupabaseClient {
  return createClient(URL!, KEY!, {
    ...baseOptions,
    global: { headers: { 'x-vote-token': voteToken } },
  });
}
