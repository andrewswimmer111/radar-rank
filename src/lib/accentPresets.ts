import type { TemplateAccent } from '@/db/hooks';

// Curated 3-color gradients for the template editor's accent picker.
// Order is the canonical preset order — index 0 is the default for
// freshly-created custom templates.
export const ACCENT_PRESETS: readonly TemplateAccent[] = [
  { start: '#FF8A3D', end: '#FF4D6D', glow: '#FF7A45' }, // sunset
  { start: '#8B8CFF', end: '#5CC8FF', glow: '#7AA9FF' }, // sky
  { start: '#7F5AF0', end: '#2CB67D', glow: '#9B7BFF' }, // synth
  { start: '#FFD23F', end: '#FF7A45', glow: '#FFC062' }, // citrus
  { start: '#FF4FB1', end: '#FF7A4F', glow: '#FF6B8C' }, // bubblegum
  { start: '#3D5AFE', end: '#42A5F5', glow: '#5C7FFF' }, // steel
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0];

export function accentEquals(a: TemplateAccent, b: TemplateAccent): boolean {
  return a.start === b.start && a.end === b.end && a.glow === b.glow;
}
