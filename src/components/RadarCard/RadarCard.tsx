import {
  BlurMask,
  Canvas,
  type CanvasRef,
  Circle,
  FractalNoise,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, type RefObject } from 'react';
import { View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Template } from '@/data/types';
import { lowestTrait, overallScore, topTrait } from '@/lib/stats';

import {
  axisAngle,
  labelAnchor,
  labelOffset,
  pointOnAxis,
  radarPolygon,
  ringPolygon,
  type Point,
} from './geometry';

const LOGICAL_W = 1080;

export type CardAspect = 'square' | 'story';

type Draft = { name: string; scores: Record<string, number> };

export type RadarCardProps = {
  template: Template;
  draft: Draft;
  width: number;
  height: number;
  aspect?: CardAspect;
  canvasRef?: RefObject<CanvasRef | null>;
};

type FontSizes = {
  name: number;
  eyebrow: number;
  axis: number;
  vertex: number;
  metricBig: number;
  metricLabel: number;
  footer: number;
};

function fontSizesFor(aspect: CardAspect): FontSizes {
  if (aspect === 'story') {
    return {
      name: 96,
      eyebrow: 26,
      axis: 26,
      vertex: 22,
      metricBig: 132,
      metricLabel: 22,
      footer: 22,
    };
  }
  return {
    name: 72,
    eyebrow: 22,
    axis: 24,
    vertex: 20,
    metricBig: 80,
    metricLabel: 20,
    footer: 22,
  };
}

export function RadarCard({
  template,
  draft,
  width,
  height,
  aspect = 'square',
  canvasRef,
}: RadarCardProps) {
  const sizes = fontSizesFor(aspect);

  const heroFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
    sizes.name,
  );
  const metricFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
    sizes.metricBig,
  );
  const traitFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
    sizes.axis + 6,
  );
  const axisFont = useFont(
    require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    sizes.axis,
  );
  const vertexFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    sizes.vertex,
  );
  const eyebrowFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    sizes.eyebrow,
  );
  const footerFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    sizes.footer,
  );

  const scale = width / LOGICAL_W;
  const logicalH = height / scale;

  const layout = useMemo(
    () => computeLayout(aspect, logicalH, sizes),
    [aspect, logicalH, sizes],
  );

  const fontsReady =
    heroFont && metricFont && traitFont && axisFont && vertexFont && eyebrowFont && footerFont;

  // Animate chart opacity from 0 → 1 on mount. Export canvas (canvasRef present) starts at 1.
  const chartOpacity = useSharedValue(canvasRef ? 1 : 0);
  useEffect(() => {
    if (!canvasRef) {
      chartOpacity.value = withTiming(1, {
        duration: 680,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, []);

  if (!fontsReady) {
    return <View style={{ width, height, backgroundColor: '#101018' }} />;
  }

  const scoreList = template.categories.map((c) => Math.round(draft.scores[c.key] ?? 50));
  const scoreFractions = scoreList.map((s) => s / 100);

  const ringFractions = [0.2, 0.4, 0.6, 0.8, 1.0];
  const ringPaths = ringFractions.map((f) =>
    polylineToPath(ringPolygon(layout.center, layout.radarRadius, scoreList.length, f), true),
  );

  const spokePath = (() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < scoreList.length; i++) {
      const a = axisAngle(i, scoreList.length);
      p.moveTo(layout.center.x, layout.center.y);
      p.lineTo(
        layout.center.x + layout.radarRadius * Math.cos(a),
        layout.center.y + layout.radarRadius * Math.sin(a),
      );
    }
    return p;
  })();

  const dataPath = polylineToPath(
    radarPolygon(layout.center, layout.radarRadius, scoreFractions),
    true,
  );

  const vertexPoints = scoreFractions.map((s, i) =>
    pointOnAxis(layout.center, layout.radarRadius, axisAngle(i, scoreList.length), s),
  );

  const upperName = (draft.name || ' ').toUpperCase();
  const eyebrowText = template.label.toUpperCase();
  const overall = overallScore(template, draft.scores);
  const top = topTrait(template, draft.scores);
  const low = lowestTrait(template, draft.scores);

  return (
    <View
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: width * 0.045,
        backgroundColor: '#0B0B12',
      }}>
      <Canvas style={{ width, height }} ref={canvasRef}>
        <Group transform={[{ scale }]}>
          {/* Base linear gradient — keeps the template's color identity */}
          <Rect x={0} y={0} width={LOGICAL_W} height={logicalH}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(LOGICAL_W, logicalH)}
              colors={[template.accent.start, template.accent.end]}
            />
          </Rect>

          {/* Soft radial highlight near the chart — adds depth */}
          <Rect x={0} y={0} width={LOGICAL_W} height={logicalH}>
            <RadialGradient
              c={vec(LOGICAL_W * 0.5, layout.center.y)}
              r={LOGICAL_W * 0.75}
              colors={[
                withAlpha(template.accent.glow, 0.55),
                withAlpha(template.accent.glow, 0.18),
                'rgba(0,0,0,0)',
              ]}
              positions={[0, 0.45, 1]}
            />
          </Rect>

          {/* Dark vignette toward edges — premium poster feel */}
          <Rect x={0} y={0} width={LOGICAL_W} height={logicalH}>
            <RadialGradient
              c={vec(LOGICAL_W * 0.5, logicalH * 0.55)}
              r={LOGICAL_W * 0.95}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
              positions={[0.45, 0.78, 1]}
            />
          </Rect>

          {/* Subtle film grain */}
          <Group opacity={0.06}>
            <Rect x={0} y={0} width={LOGICAL_W} height={logicalH}>
              <FractalNoise freqX={0.65} freqY={0.65} octaves={2} seed={11} />
            </Rect>
          </Group>

          {/* Chart group — fades in after card entrance */}
          <Group opacity={chartOpacity}>
            {/* Outer glow ring behind chart */}
            <Group opacity={0.85}>
              <Circle cx={layout.center.x} cy={layout.center.y} r={layout.radarRadius * 1.18}>
                <RadialGradient
                  c={vec(layout.center.x, layout.center.y)}
                  r={layout.radarRadius * 1.18}
                  colors={[
                    withAlpha(template.accent.glow, 0.0),
                    withAlpha(template.accent.glow, 0.35),
                    withAlpha(template.accent.glow, 0.0),
                  ]}
                  positions={[0.55, 0.78, 1]}
                />
              </Circle>
            </Group>

            {/* Radar rings */}
            {ringPaths.map((p, i) => (
              <Path
                key={`ring-${i}`}
                path={p}
                style="stroke"
                strokeWidth={1.25}
                color={`rgba(255,255,255,${0.06 + i * 0.04})`}
              />
            ))}

            {/* Spokes */}
            <Path
              path={spokePath}
              style="stroke"
              strokeWidth={1}
              color="rgba(255,255,255,0.18)"
            />

            {/* Data polygon — soft white glow underlay */}
            <Group opacity={0.55}>
              <Path path={dataPath} style="fill" color="rgba(255,255,255,0.20)">
                <BlurMask blur={18} style="normal" />
              </Path>
            </Group>

            {/* Data polygon fill */}
            <Path path={dataPath} style="fill" color="rgba(255,255,255,0.22)" />

            {/* Data polygon stroke */}
            <Path
              path={dataPath}
              style="stroke"
              strokeWidth={4}
              strokeJoin="round"
              color="#FFFFFF"
            />

            {/* Vertex dots */}
            {vertexPoints.map((p, i) => (
              <Group key={`vx-${i}`}>
                <Circle cx={p.x} cy={p.y} r={9} color="rgba(255,255,255,0.95)" />
                <Circle cx={p.x} cy={p.y} r={4.5} color={template.accent.glow} />
              </Group>
            ))}

            {/* Axis labels */}
            {template.categories.map((cat, i) => {
              const a = axisAngle(i, scoreList.length);
              const anchor = labelAnchor(layout.center, layout.radarRadius, a, 22);
              const label = cat.label.toUpperCase();
              const tw = axisFont.measureText(label).width;
              const { x, y } = labelOffset(anchor, a, tw, sizes.axis * 0.7);
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
            })}
          </Group>

          {/* Header zone: eyebrow + name */}
          <HeaderZone
            aspect={aspect}
            eyebrowText={eyebrowText}
            nameText={upperName}
            heroFont={heroFont}
            eyebrowFont={eyebrowFont}
            layout={layout}
          />

          {/* Stat zone — branches on aspect */}
          {aspect === 'square' ? (
            <SquareStatStrip
              layout={layout}
              eyebrowFont={eyebrowFont}
              traitFont={traitFont}
              top={top}
              low={low}
              overall={overall}
            />
          ) : (
            <StoryStatStack
              layout={layout}
              eyebrowFont={eyebrowFont}
              traitFont={traitFont}
              vertexFont={vertexFont}
              metricFont={metricFont}
              top={top}
              low={low}
              overall={overall}
            />
          )}

        </Group>
      </Canvas>
    </View>
  );
}

type Layout = {
  pad: number;
  headerEyebrowY: number;
  headerNameY: number;
  center: Point;
  radarRadius: number;
  statTop: number;
  footerY: number;
  logicalH: number;
};

function computeLayout(aspect: CardAspect, logicalH: number, sizes: FontSizes): Layout {
  if (aspect === 'story') {
    const pad = 96;
    const headerEyebrowY = 160;
    const headerNameY = headerEyebrowY + 110;
    const radarRadius = 410;
    const center: Point = { x: LOGICAL_W / 2, y: 900 };
    const statTop = 1410;
    const footerY = logicalH - 70;
    return { pad, headerEyebrowY, headerNameY, center, radarRadius, statTop, footerY, logicalH };
  }
  const pad = 64;
  const headerEyebrowY = 92;
  const headerNameY = 165;
  const radarRadius = 305;
  const center: Point = { x: LOGICAL_W / 2, y: 560 };
  const statTop = 950;
  const footerY = logicalH - 32;
  return { pad, headerEyebrowY, headerNameY, center, radarRadius, statTop, footerY, logicalH };
}

type SkiaFont = NonNullable<ReturnType<typeof useFont>>;

function HeaderZone({
  aspect,
  eyebrowText,
  nameText,
  heroFont,
  eyebrowFont,
  layout,
}: {
  aspect: CardAspect;
  eyebrowText: string;
  nameText: string;
  heroFont: SkiaFont;
  eyebrowFont: SkiaFont;
  layout: Layout;
}) {
  if (aspect === 'story') {
    const eyebrowW = eyebrowFont.measureText(eyebrowText).width;
    const eyebrowX = (LOGICAL_W - eyebrowW) / 2;
    const display = trimToWidth(nameText, heroFont, LOGICAL_W - layout.pad * 2);
    const nameW = heroFont.measureText(display).width;
    const nameX = (LOGICAL_W - nameW) / 2;
    return (
      <Group>
        <SkText
          x={eyebrowX}
          y={layout.headerEyebrowY}
          text={eyebrowText}
          font={eyebrowFont}
          color="rgba(255,255,255,0.78)"
        />
        <SkText
          x={nameX}
          y={layout.headerNameY}
          text={display}
          font={heroFont}
          color="#FFFFFF"
        />
      </Group>
    );
  }
  const display = trimToWidth(nameText, heroFont, LOGICAL_W - layout.pad * 2);
  return (
    <Group>
      <SkText
        x={layout.pad}
        y={layout.headerEyebrowY}
        text={eyebrowText}
        font={eyebrowFont}
        color="rgba(255,255,255,0.78)"
      />
      <SkText
        x={layout.pad}
        y={layout.headerNameY}
        text={display}
        font={heroFont}
        color="#FFFFFF"
      />
    </Group>
  );
}

function SquareStatStrip({
  layout,
  eyebrowFont,
  traitFont,
  top,
  low,
  overall,
}: {
  layout: Layout;
  eyebrowFont: SkiaFont;
  traitFont: SkiaFont;
  top: { label: string; score: number };
  low: { label: string; score: number };
  overall: number;
}) {
  const stripH = 110;
  const stripY = layout.statTop;
  const stripX = layout.pad;
  const stripW = LOGICAL_W - layout.pad * 2;
  const colW = stripW / 3;

  const cols = [
    { eyebrow: 'TOP TRAIT', mainText: top.label.toUpperCase() },
    { eyebrow: 'OVERALL', mainText: `${overall}` },
    { eyebrow: 'LOWEST', mainText: low.label.toUpperCase() },
  ];

  return (
    <Group>
      {/* Translucent backing panel + thin top/bottom rules */}
      <Rect x={stripX} y={stripY} width={stripW} height={stripH} color="rgba(0,0,0,0.24)" />
      <Rect x={stripX} y={stripY} width={stripW} height={1} color="rgba(255,255,255,0.20)" />
      <Rect
        x={stripX}
        y={stripY + stripH - 1}
        width={stripW}
        height={1}
        color="rgba(255,255,255,0.08)"
      />

      {cols.map((col, i) => {
        const colCenterX = stripX + colW * i + colW / 2;
        const eyebrowW = eyebrowFont.measureText(col.eyebrow).width;
        const eyebrowX = colCenterX - eyebrowW / 2;
        const eyebrowY = stripY + 34;

        const main = trimToWidth(col.mainText, traitFont, colW - 28);
        const mainTw = traitFont.measureText(main).width;
        const mainX = colCenterX - mainTw / 2;
        const mainY = stripY + 86;

        return (
          <Group key={col.eyebrow}>
            <SkText
              x={eyebrowX}
              y={eyebrowY}
              text={col.eyebrow}
              font={eyebrowFont}
              color="rgba(255,255,255,0.65)"
            />
            <SkText x={mainX} y={mainY} text={main} font={traitFont} color="#FFFFFF" />
            {i < cols.length - 1 && (
              <Rect
                x={stripX + colW * (i + 1) - 0.5}
                y={stripY + 22}
                width={1}
                height={stripH - 44}
                color="rgba(255,255,255,0.12)"
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

function StoryStatStack({
  layout,
  eyebrowFont,
  traitFont,
  vertexFont,
  metricFont,
  top,
  low,
  overall,
}: {
  layout: Layout;
  eyebrowFont: SkiaFont;
  traitFont: SkiaFont;
  vertexFont: SkiaFont;
  metricFont: SkiaFont;
  top: { label: string; score: number };
  low: { label: string; score: number };
  overall: number;
}) {
  const cx = LOGICAL_W / 2;

  const eyebrowText = 'OVERALL RATING';
  const eyebrowW = eyebrowFont.measureText(eyebrowText).width;
  const eyebrowBaseline = layout.statTop;

  const numStr = `${overall}`;
  const numW = metricFont.measureText(numStr).width;
  const numBaseline = eyebrowBaseline + 145;

  // Two-column TOP / LOWEST row — flows directly from the big number.
  const traitRowEyebrow = numBaseline + 110;
  const traitLabelBaseline = traitRowEyebrow + 56;
  const traitScoreBaseline = traitLabelBaseline + 42;

  const colHalf = LOGICAL_W / 2;
  const topX = layout.pad;
  const lowX = colHalf + 24;
  const traitColW = LOGICAL_W / 2 - layout.pad - 24;

  return (
    <Group>
      <SkText
        x={cx - eyebrowW / 2}
        y={eyebrowBaseline}
        text={eyebrowText}
        font={eyebrowFont}
        color="rgba(255,255,255,0.72)"
      />
      <SkText
        x={cx - numW / 2}
        y={numBaseline}
        text={numStr}
        font={metricFont}
        color="#FFFFFF"
      />

      <SkText
        x={topX}
        y={traitRowEyebrow}
        text="TOP TRAIT"
        font={eyebrowFont}
        color="rgba(255,255,255,0.65)"
      />
      <SkText
        x={topX}
        y={traitLabelBaseline}
        text={trimToWidth(top.label.toUpperCase(), traitFont, traitColW)}
        font={traitFont}
        color="#FFFFFF"
      />
      <SkText
        x={topX}
        y={traitScoreBaseline}
        text={`${top.score} /100`}
        font={vertexFont}
        color="rgba(255,255,255,0.7)"
      />

      <SkText
        x={lowX}
        y={traitRowEyebrow}
        text="LOWEST"
        font={eyebrowFont}
        color="rgba(255,255,255,0.65)"
      />
      <SkText
        x={lowX}
        y={traitLabelBaseline}
        text={trimToWidth(low.label.toUpperCase(), traitFont, traitColW)}
        font={traitFont}
        color="#FFFFFF"
      />
      <SkText
        x={lowX}
        y={traitScoreBaseline}
        text={`${low.score} /100`}
        font={vertexFont}
        color="rgba(255,255,255,0.7)"
      />

      <Rect
        x={colHalf - 0.5}
        y={traitRowEyebrow - 24}
        width={1}
        height={traitScoreBaseline - traitRowEyebrow + 36}
        color="rgba(255,255,255,0.16)"
      />
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

function trimToWidth(text: string, font: SkiaFont, maxWidth: number): string {
  let display = text;
  while (display.length > 1 && font.measureText(display).width > maxWidth) {
    display = display.slice(0, -1);
  }
  if (display.length < text.length) display = display.slice(0, -1) + '…';
  return display;
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const aHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0');
  if (hex.length === 7) return hex + aHex;
  return hex;
}
