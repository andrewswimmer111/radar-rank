export type CategoryKey = string;

export type Category = {
  key: CategoryKey;
  label: string;
  hint?: string;
};

export type ArchetypeRule = {
  name: string;
  tagline: string;
  weights: Partial<Record<CategoryKey, number>>;
  bias?: number;
};

export type TemplateAccent = {
  start: string;
  end: string;
  glow: string;
};

export type Template = {
  id: string;
  label: string;
  blurb: string;
  emoji: string;
  accent: TemplateAccent;
  categories: Category[];
  archetypes: ArchetypeRule[];
};

export type Scores = Record<CategoryKey, number>;
