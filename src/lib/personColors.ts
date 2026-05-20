// Color cycle for person initial chips. Indexed by position so a
// person's color stays stable as long as the list order doesn't shift.
const PALETTE = [
  '#FF8A3D',
  '#5CC8FF',
  '#7F5AF0',
  '#2CB67D',
  '#FF4FB1',
  '#FFD23F',
  '#8B8CFF',
  '#FF6B6B',
] as const;

export function pickPersonColor(index: number): string {
  return PALETTE[Math.max(0, index) % PALETTE.length];
}
