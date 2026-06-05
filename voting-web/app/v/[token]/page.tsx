import { withVoteToken } from '@/lib/supabase';

import { ErrorState } from './ErrorState';
import { VoteForm } from './VoteForm';

type SharedEvaluation = {
  id: string;
  title: string;
  accent_start: string;
  accent_end: string;
  accent_glow: string;
  frozen_at: string | null;
};

type SharedParticipant = {
  local_id: string;
  name: string;
  color: string | null;
  position: number;
};

type SharedCategory = {
  key: string;
  label: string;
  hint: string | null;
  position: number;
};

export const dynamic = 'force-dynamic';

export default async function VotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = withVoteToken(token);

  const { data: evaluation } = await sb
    .from('shared_evaluations')
    .select('id, title, accent_start, accent_end, accent_glow, frozen_at')
    .maybeSingle<SharedEvaluation>();

  if (!evaluation) {
    return <ErrorState />;
  }

  if (evaluation.frozen_at) {
    return <ErrorState variant="frozen" />;
  }

  const [participantsRes, categoriesRes] = await Promise.all([
    sb
      .from('shared_participants')
      .select('local_id, name, color, position')
      .eq('shared_evaluation_id', evaluation.id)
      .order('position', { ascending: true }),
    sb
      .from('shared_categories')
      .select('key, label, hint, position')
      .eq('shared_evaluation_id', evaluation.id)
      .order('position', { ascending: true }),
  ]);

  const participants = (participantsRes.data ?? []) as SharedParticipant[];
  const categories = (categoriesRes.data ?? []) as SharedCategory[];

  if (participants.length === 0 || categories.length === 0) {
    return <ErrorState />;
  }

  return (
    <VoteForm
      voteToken={token}
      evaluation={evaluation}
      participants={participants}
      categories={categories}
    />
  );
}
