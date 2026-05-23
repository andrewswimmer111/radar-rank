export type CategoryKey = string;

export type Category = {
  key: CategoryKey;
  label: string;
  hint?: string;
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
  accent: TemplateAccent;
  categories: Category[];
};

export type Scores = Record<CategoryKey, number>;
