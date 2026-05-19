import type { Template } from './types';

export const TEMPLATES: Template[] = [
  {
    id: 'gym-bro',
    label: 'Gym Bro',
    blurb: 'The cold truth about your lifting persona',
    emoji: '🦍',
    accent: { start: '#FF8A3D', end: '#FF2D87', glow: '#FF6B3D' },
    categories: [
      { key: 'mass', label: 'Mass', hint: 'plate count, not vibes' },
      { key: 'mirror_time', label: 'Mirror Time' },
      { key: 'preworkout', label: 'Pre-Workout Reliance' },
      { key: 'form', label: 'Form' },
      { key: 'rest_day_hatred', label: 'Rest-Day Hatred' },
      { key: 'aesthetic_splits', label: 'Aesthetic Splits' },
    ],
  },
  {
    id: 'roommate',
    label: 'Roommate',
    blurb: 'Your lease behavior, finally on the record',
    emoji: '🛋️',
    accent: { start: '#9B8CFF', end: '#5BD2F0', glow: '#7AA9FF' },
    categories: [
      { key: 'dish_karma', label: 'Dish Karma' },
      { key: 'noise_discipline', label: 'Noise Discipline' },
      { key: 'bill_reliability', label: 'Bill Reliability' },
      { key: 'vibe_curation', label: 'Vibe Curation' },
      { key: 'snack_sharing', label: 'Snack Sharing' },
      { key: 'bathroom_honor', label: 'Bathroom Honor' },
    ],
  },
  {
    id: 'dating-profile',
    label: 'Dating Profile',
    blurb: 'A cold radar of your romantic export',
    emoji: '💌',
    accent: { start: '#FF4FB1', end: '#FF7A4F', glow: '#FF6B8C' },
    categories: [
      { key: 'selfie_game', label: 'Selfie Game' },
      { key: 'bio_wit', label: 'Bio Wit' },
      { key: 'texting_stamina', label: 'Texting Stamina' },
      { key: 'date_logistics', label: 'Date Logistics' },
      { key: 'mystery', label: 'Mystery' },
      { key: 'red_flag_energy', label: 'Red Flag Energy' },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function defaultScoresFor(template: Template): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of template.categories) out[c.key] = 50;
  return out;
}
