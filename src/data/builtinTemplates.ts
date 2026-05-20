// Curated starter templates seeded into the templates table on first
// launch. Stable IDs so a reinstall produces the same rows. Sprint 1
// scope assumes at most 3 built-ins; the gallery and any percentile
// math should tolerate the count but not depend on which three.

export type BuiltinCategory = {
  key: string;
  label: string;
};

export type BuiltinTemplate = {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  accent: { start: string; end: string; glow: string };
  categories: BuiltinCategory[];
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: 'builtin-athleticism',
    name: 'Athleticism',
    blurb: 'A subjective breakdown of movement, endurance, and coordination.',
    emoji: '🏃',
    accent: { start: '#FF8A3D', end: '#FF4D6D', glow: '#FF7A45' },
    categories: [
      { key: 'basketball', label: 'Basketball' },
      { key: 'soccer', label: 'Soccer' },
      { key: 'football', label: 'Football' },
      { key: 'swimming', label: 'Swimming' },
      { key: 'running', label: 'Running' },
      { key: 'coordination', label: 'Coordination' },
    ],
  },
  {
    id: 'builtin-roommate-profile',
    name: 'Roommate Profile',
    blurb: 'Living compatibility, quantified through observation and opinion.',
    emoji: '🛋️',
    accent: { start: '#8B8CFF', end: '#5CC8FF', glow: '#7AA9FF' },
    categories: [
      { key: 'cleanliness', label: 'Cleanliness' },
      { key: 'noise_awareness', label: 'Noise Awareness' },
      { key: 'bill_reliability', label: 'Bill Reliability' },
      { key: 'kitchen_etiquette', label: 'Kitchen Etiquette' },
      { key: 'guest_management', label: 'Guest Management' },
      { key: 'overall_vibes', label: 'Overall Vibes' },
    ],
  },
  {
    id: 'builtin-music-taste',
    name: 'Music Taste',
    blurb: 'A profile of discovery, range, consistency, and replay value.',
    emoji: '🎧',
    accent: { start: '#7F5AF0', end: '#2CB67D', glow: '#9B7BFF' },
    categories: [
      { key: 'range', label: 'Range' },
      { key: 'discovery', label: 'Discovery' },
      { key: 'consistency', label: 'Consistency' },
      { key: 'replayability', label: 'Replayability' },
      { key: 'taste_level', label: 'Taste Level' },
      { key: 'aux_skill', label: 'Aux Skill' },
    ],
  },
];
