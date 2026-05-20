// Time-sortable, non-cryptographic IDs. Sufficient for client-side
// primary keys; sortable-by-creation when read raw.
export function genId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}${r}`;
}

export function now(): number {
  return Date.now();
}
