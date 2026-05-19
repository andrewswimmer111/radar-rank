export type Point = { x: number; y: number };

export function axisAngle(index: number, count: number): number {
  return -Math.PI / 2 + (2 * Math.PI * index) / count;
}

export function pointOnAxis(
  center: Point,
  radius: number,
  angle: number,
  scale: number,
): Point {
  return {
    x: center.x + radius * scale * Math.cos(angle),
    y: center.y + radius * scale * Math.sin(angle),
  };
}

export function radarPolygon(
  center: Point,
  radius: number,
  scales: number[],
): Point[] {
  return scales.map((s, i) => pointOnAxis(center, radius, axisAngle(i, scales.length), s));
}

export function ringPolygon(
  center: Point,
  radius: number,
  count: number,
  fraction: number,
): Point[] {
  return Array.from({ length: count }, (_, i) =>
    pointOnAxis(center, radius, axisAngle(i, count), fraction),
  );
}

export function labelAnchor(
  center: Point,
  radius: number,
  angle: number,
  padding: number,
): Point {
  return {
    x: center.x + (radius + padding) * Math.cos(angle),
    y: center.y + (radius + padding) * Math.sin(angle),
  };
}

export function labelOffset(
  anchor: Point,
  angle: number,
  textWidth: number,
  textHeight: number,
): Point {
  const dx = -textWidth * (1 - Math.cos(angle)) / 2;
  const dy = textHeight * (1 + Math.sin(angle)) / 2;
  return { x: anchor.x + dx, y: anchor.y + dy };
}
