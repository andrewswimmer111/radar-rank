// Curated starter templates seeded into the templates table on first
// launch. Stable IDs so a reinstall produces the same rows. Sprint 1
// scope assumes at most 2 built-ins; the gallery and any percentile
// math should tolerate the count but not depend on which two.

export type BuiltinCategory = {
  key: string;
  label: string;
};

export type BuiltinTemplate = {
  id: string;
  name: string;
  blurb: string;
  accent: { start: string; end: string; glow: string };
  categories: BuiltinCategory[];
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: 'builtin-athleticism',
    name: 'Athleticism',
    blurb: 'A subjective breakdown of movement, endurance, and coordination.',
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
    id: 'builtin-music-taste',
    name: 'Music Taste',
    blurb: 'A profile of discovery, range, consistency, and replay value.',
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
