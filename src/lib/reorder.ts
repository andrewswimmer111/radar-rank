// Swap an item with its neighbor. Returns the resulting list of ids, or null
// if the move is a no-op (item missing or already at the edge) so callers can
// skip the DB write entirely.
export function swapAdjacent<T extends { id: string }>(
  items: readonly T[],
  id: string,
  direction: 'up' | 'down',
): string[] | null {
  const idx = items.findIndex((it) => it.id === id);
  if (idx < 0) return null;
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= items.length) return null;
  const ids = items.map((it) => it.id);
  [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
  return ids;
}
