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
    blurb: 'A subjective breakdown of speed, endurance, and coordination.',
    accent: { start: '#FF8A3D', end: '#FF4D6D', glow: '#FF7A45' },
    categories: [
      { key: 'swim_100yd', label: '100yd Swim' },
      { key: 'dash_100m', label: '100m Dash' },
      { key: 'run_5k', label: '5k Run' },
      { key: 'basketball', label: 'Basketball' },
      { key: 'tennis', label: 'Tennis' },
    ],
  },
];
