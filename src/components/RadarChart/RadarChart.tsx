import {
  BlurMask,
  Circle,
  Group,
  Path,
  RadialGradient,
  Skia,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  axisAngle,
  labelAnchor,
  labelOffset,
  ringPolygon,
  type Point,
} from '../RadarCard/geometry';

export type RadarSeries = {
  id: string;
  scores: Record<string, number>;
  // Used for the vertex inner dot, and — in multi-series mode — the
  // polygon fill and stroke. In single-series mode the polygon stays
  // white so the card's tinted background carries the color identity.
  color: string;
};

export type RadarChartProps = {
  center: Point;
  radius: number;
  categories: readonly { key: string; label: string }[];
  series: readonly RadarSeries[];
  // Outer halo behind the chart. Single-series cards pass the template
  // accent glow; multi-series compare omits it.
  glowColor?: string;
  // Mount fade-in. Disabled for static (export) renders so the captured
  // PNG always shows the final chart.
  animateIn?: boolean;
};

const AXIS_FONT_SIZE = 24;

export function RadarChart({
  center,
  radius,
  categories,
  series,
  glowColor,
  animateIn = true,
}: RadarChartProps) {
  const axisFont = useFont(
    require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    AXIS_FONT_SIZE,
  );

  const opacity = useSharedValue(animateIn ? 0 : 1);
  useEffect(() => {
    if (animateIn) {
      opacity.value = withTiming(1, {
        duration: 680,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, []);

  const vertexCount = categories.length;

  const ringPaths = useMemo(
    () =>
      [0.2, 0.4, 0.6, 0.8, 1.0].map((f) =>
        polylineToPath(ringPolygon(center, radius, vertexCount, f), true),
      ),
    [center.x, center.y, radius, vertexCount],
  );

  const spokePath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < vertexCount; i++) {
      const a = axisAngle(i, vertexCount);
      p.moveTo(center.x, center.y);
      p.lineTo(center.x + radius * Math.cos(a), center.y + radius * Math.sin(a));
    }
    return p;
  }, [center.x, center.y, radius, vertexCount]);

  const isMulti = series.length > 1;

  return (
    <Group opacity={opacity}>
      {glowColor ? (
        <Group opacity={0.85}>
          <Circle cx={center.x} cy={center.y} r={radius * 1.18}>
            <RadialGradient
              c={vec(center.x, center.y)}
              r={radius * 1.18}
              colors={[
                withAlpha(glowColor, 0),
                withAlpha(glowColor, 0.35),
                withAlpha(glowColor, 0),
              ]}
              positions={[0.55, 0.78, 1]}
            />
          </Circle>
        </Group>
      ) : null}

      {ringPaths.map((p, i) => (
        <Path
          key={`ring-${i}`}
          path={p}
          style="stroke"
          strokeWidth={1.25}
          color={`rgba(255,255,255,${0.06 + i * 0.04})`}
        />
      ))}

      <Path
        path={spokePath}
        style="stroke"
        strokeWidth={1}
        color="rgba(255,255,255,0.18)"
      />

      {series.map((s) => (
        <SeriesPolygon
          key={s.id}
          center={center}
          radius={radius}
          categories={categories}
          series={s}
          isMulti={isMulti}
        />
      ))}

      {axisFont
        ? categories.map((cat, i) => {
            const a = axisAngle(i, vertexCount);
            const anchor = labelAnchor(center, radius, a, 22);
            const label = cat.label.toUpperCase();
            const tw = axisFont.measureText(label).width;
            const { x, y } = labelOffset(anchor, a, tw, AXIS_FONT_SIZE * 0.7);
            return (
              <SkText
                key={cat.key}
                x={x}
                y={y}
                text={label}
                font={axisFont}
                color="rgba(255,255,255,0.9)"
              />
            );
          })
        : null}
    </Group>
  );
}

function SeriesPolygon({
  center,
  radius,
  categories,
  series,
  isMulti,
}: {
  center: Point;
  radius: number;
  categories: readonly { key: string; label: string }[];
  series: RadarSeries;
  isMulti: boolean;
}) {
  const targetFractions = useMemo(
    () => categories.map((c) => Math.round(series.scores[c.key] ?? 50) / 100),
    [categories, series.scores],
  );
  const targetKey = targetFractions.join(',');

  const progress = useSharedValue(1);
  const fromScales = useSharedValue<number[]>(targetFractions);
  const toScales = useSharedValue<number[]>(targetFractions);

  // When the score input changes, snapshot the current (possibly mid-
  // morph) interpolated scales as the new `from`, set the new `to`, and
  // ease progress 0 → 1 over 240ms. Interrupting a morph this way means
  // chained slider commits chase the latest target smoothly.
  useEffect(() => {
    const from = fromScales.value;
    const to = toScales.value;
    const t = progress.value;
    const n = targetFractions.length;
    const current: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = from[i] ?? 0.5;
      const b = to[i] ?? 0.5;
      current.push(a + (b - a) * t);
    }
    fromScales.value = current;
    toScales.value = targetFractions;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetKey]);

  const dataPath = useDerivedValue(() => {
    const t = progress.value;
    const from = fromScales.value;
    const to = toScales.value;
    const n = Math.max(from.length, to.length);
    const p = Skia.Path.Make();
    if (n < 3) return p;
    for (let i = 0; i < n; i++) {
      const a = from[i] ?? 0.5;
      const b = to[i] ?? 0.5;
      const s = a + (b - a) * t;
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = center.x + radius * s * Math.cos(angle);
      const y = center.y + radius * s * Math.sin(angle);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.close();
    return p;
  });

  const outerVertexPath = useDerivedValue(() => {
    const t = progress.value;
    const from = fromScales.value;
    const to = toScales.value;
    const n = Math.max(from.length, to.length);
    const p = Skia.Path.Make();
    for (let i = 0; i < n; i++) {
      const a = from[i] ?? 0.5;
      const b = to[i] ?? 0.5;
      const s = a + (b - a) * t;
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const cx = center.x + radius * s * Math.cos(angle);
      const cy = center.y + radius * s * Math.sin(angle);
      p.addCircle(cx, cy, 9);
    }
    return p;
  });

  const innerVertexPath = useDerivedValue(() => {
    const t = progress.value;
    const from = fromScales.value;
    const to = toScales.value;
    const n = Math.max(from.length, to.length);
    const p = Skia.Path.Make();
    for (let i = 0; i < n; i++) {
      const a = from[i] ?? 0.5;
      const b = to[i] ?? 0.5;
      const s = a + (b - a) * t;
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const cx = center.x + radius * s * Math.cos(angle);
      const cy = center.y + radius * s * Math.sin(angle);
      p.addCircle(cx, cy, 4.5);
    }
    return p;
  });

  const polyFill = isMulti
    ? withAlpha(series.color, 0.18)
    : 'rgba(255,255,255,0.22)';
  const polyStroke = isMulti ? series.color : '#FFFFFF';
  const glowFill = isMulti
    ? withAlpha(series.color, 0.3)
    : 'rgba(255,255,255,0.20)';

  return (
    <Group>
      <Group opacity={0.55}>
        <Path path={dataPath} style="fill" color={glowFill}>
          <BlurMask blur={18} style="normal" />
        </Path>
      </Group>
      <Path path={dataPath} style="fill" color={polyFill} />
      <Path
        path={dataPath}
        style="stroke"
        strokeWidth={4}
        strokeJoin="round"
        color={polyStroke}
      />
      <Path path={outerVertexPath} style="fill" color="rgba(255,255,255,0.95)" />
      <Path path={innerVertexPath} style="fill" color={series.color} />
    </Group>
  );
}

function polylineToPath(points: Point[], closed: boolean) {
  const p = Skia.Path.Make();
  if (points.length === 0) return p;
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
  if (closed) p.close();
  return p;
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const aHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0');
  if (hex.length === 7) return hex + aHex;
  return hex;
}
