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
  Skia,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, type RefObject } from 'react';
import { View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Template } from '@/data/types';
import {
  gradeFromScore,
  overallScore,
  percentileAmong,
  profileArchetype,
} from '@/lib/stats';

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
const LOGICAL_H = 1080;

type Draft = { name: string; scores: Record<string, number> };

export type RadarCardProps = {
  template: Template;
  draft: Draft;
  width: number;
  height: number;
  canvasRef?: RefObject<CanvasRef | null>;
  // OVRs of every non-excluded peer in the same evaluation. When provided,
  // the card renders a percentile chip next to OVR. Omitted = standalone
  // card (no percentile).
  peerOverallScores?: readonly number[];
};

const SIZES = {
  name: 80,
  eyebrow: 22,
  axis: 24,
  vertex: 20,
  ovr: 56,
  ovrLabel: 18,
  grade: 38,
  footer: 16,
} as const;

export function RadarCard({
  template,
  draft,
  width,
  height,
  canvasRef,
  peerOverallScores,
}: RadarCardProps) {
  const heroFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
    SIZES.name,
  );
  const axisFont = useFont(
    require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    SIZES.axis,
  );
  const eyebrowFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    SIZES.eyebrow,
  );
  const footerFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    SIZES.footer,
  );
  const ovrFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
    SIZES.ovr,
  );
  const ovrLabelFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    SIZES.ovrLabel,
  );
  const gradeFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
    SIZES.grade,
  );

  const scale = width / LOGICAL_W;

  const layout = useMemo(() => computeLayout(), []);

  const fontsReady =
    heroFont &&
    axisFont &&
    eyebrowFont &&
    footerFont &&
    ovrFont &&
    ovrLabelFont &&
    gradeFont;

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
  const archetype = profileArchetype(template, draft.scores).toUpperCase();
  const ovr = overallScore(template, draft.scores);
  const grade = gradeFromScore(ovr);
  const percentile =
    peerOverallScores && peerOverallScores.length > 0
      ? percentileAmong(ovr, peerOverallScores)
      : null;

  return (
    <View
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: width * 0.05,
        backgroundColor: '#0B0B12',
      }}>
      <Canvas style={{ width, height }} ref={canvasRef}>
        <Group transform={[{ scale }]}>
          {/* Base linear gradient — keeps the template's color identity */}
          <Rect x={0} y={0} width={LOGICAL_W} height={LOGICAL_H}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(LOGICAL_W, LOGICAL_H)}
              colors={[template.accent.start, template.accent.end]}
            />
          </Rect>

          {/* Soft radial highlight near the chart — depth */}
          <Rect x={0} y={0} width={LOGICAL_W} height={LOGICAL_H}>
            <RadialGradient
              c={vec(LOGICAL_W * 0.5, layout.center.y)}
              r={LOGICAL_W * 0.78}
              colors={[
                withAlpha(template.accent.glow, 0.55),
                withAlpha(template.accent.glow, 0.18),
                'rgba(0,0,0,0)',
              ]}
              positions={[0, 0.45, 1]}
            />
          </Rect>

          {/* Top highlight — gives the card a subtle "sheen" */}
          <Rect x={0} y={0} width={LOGICAL_W} height={LOGICAL_H * 0.45}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, LOGICAL_H * 0.45)}
              colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
            />
          </Rect>

          {/* Dark vignette toward edges — premium poster feel */}
          <Rect x={0} y={0} width={LOGICAL_W} height={LOGICAL_H}>
            <RadialGradient
              c={vec(LOGICAL_W * 0.5, LOGICAL_H * 0.55)}
              r={LOGICAL_W * 0.95}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.58)']}
              positions={[0.45, 0.78, 1]}
            />
          </Rect>

          {/* Subtle film grain */}
          <Group opacity={0.06}>
            <Rect x={0} y={0} width={LOGICAL_W} height={LOGICAL_H}>
              <FractalNoise freqX={0.65} freqY={0.65} octaves={2} seed={11} />
            </Rect>
          </Group>

          {/* Inner frame — collectible card border */}
          <Rect
            x={layout.frameInset}
            y={layout.frameInset}
            width={LOGICAL_W - layout.frameInset * 2}
            height={LOGICAL_H - layout.frameInset * 2}
            color="rgba(255,255,255,0.08)"
            style="stroke"
            strokeWidth={1}
          />

          {/* Header zone: eyebrow + name */}
          <HeaderZone
            eyebrowText={eyebrowText}
            nameText={upperName}
            heroFont={heroFont}
            eyebrowFont={eyebrowFont}
            layout={layout}
          />

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
              const { x, y } = labelOffset(anchor, a, tw, SIZES.axis * 0.7);
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

          {/* Stats strip — OVR, grade, optional percentile. Sits above
              the footer brand row. */}
          <StatsStrip
            layout={layout}
            ovr={ovr}
            grade={grade}
            percentile={percentile}
            ovrFont={ovrFont}
            ovrLabelFont={ovrLabelFont}
            gradeFont={gradeFont}
          />

          {/* Footer brand — archetype · RADARRANK */}
          <FooterBrand
            layout={layout}
            footerFont={footerFont}
            archetypeText={archetype}
          />
        </Group>
      </Canvas>
    </View>
  );
}

type Layout = {
  pad: number;
  frameInset: number;
  headerEyebrowY: number;
  headerNameY: number;
  center: Point;
  radarRadius: number;
  statsY: number;
  footerY: number;
};

function computeLayout(): Layout {
  return {
    pad: 64,
    frameInset: 28,
    headerEyebrowY: 100,
    headerNameY: 184,
    center: { x: LOGICAL_W / 2, y: 580 },
    radarRadius: 340,
    statsY: 990,
    footerY: LOGICAL_H - 26,
  };
}

type SkiaFont = NonNullable<ReturnType<typeof useFont>>;

function HeaderZone({
  eyebrowText,
  nameText,
  heroFont,
  eyebrowFont,
  layout,
}: {
  eyebrowText: string;
  nameText: string;
  heroFont: SkiaFont;
  eyebrowFont: SkiaFont;
  layout: Layout;
}) {
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

function FooterBrand({
  layout,
  footerFont,
  archetypeText,
}: {
  layout: Layout;
  footerFont: SkiaFont;
  archetypeText: string;
}) {
  const text = `${archetypeText}  ·  RADARRANK`;
  const w = footerFont.measureText(text).width;
  return (
    <SkText
      x={(LOGICAL_W - w) / 2}
      y={layout.footerY}
      text={text}
      font={footerFont}
      color="rgba(255,255,255,0.48)"
    />
  );
}

function StatsStrip({
  layout,
  ovr,
  grade,
  percentile,
  ovrFont,
  ovrLabelFont,
  gradeFont,
}: {
  layout: Layout;
  ovr: number;
  grade: string;
  percentile: number | null;
  ovrFont: SkiaFont;
  ovrLabelFont: SkiaFont;
  gradeFont: SkiaFont;
}) {
  // Two visual chunks:
  //   [ OVR <huge number> ]    [ <grade>   <percentile> ]
  // joined by a thin divider. Centered horizontally as one composite row.
  const labelText = 'OVR';
  const ovrText = String(ovr);
  const percentileText = percentile != null ? `${percentile}p` : null;

  const labelW = ovrLabelFont.measureText(labelText).width;
  const ovrW = ovrFont.measureText(ovrText).width;
  const gradeW = gradeFont.measureText(grade).width;
  const percentileW = percentileText
    ? ovrLabelFont.measureText(percentileText).width
    : 0;

  const leftGroupW = labelW + 12 + ovrW;
  const rightInnerW =
    percentileText != null ? gradeW + 16 + percentileW : gradeW;
  const dividerW = 1;
  const gapBetween = 28;
  const totalW = leftGroupW + gapBetween + dividerW + gapBetween + rightInnerW;
  const startX = (LOGICAL_W - totalW) / 2;

  // Vertical alignment baseline: the OVR number is the tallest element.
  // y in Skia text is the baseline; tune so the numbers feel centered.
  const baseY = layout.statsY;
  const labelBaselineY = baseY - 24; // small label sits above the big number
  const ovrBaselineY = baseY + 10;
  const gradeBaselineY = baseY + 2;
  const percentileBaselineY = baseY + 2;

  let cursor = startX;

  return (
    <Group>
      <SkText
        x={cursor}
        y={labelBaselineY}
        text={labelText}
        font={ovrLabelFont}
        color="rgba(255,255,255,0.72)"
      />
      <SkText
        x={cursor + labelW + 12}
        y={ovrBaselineY}
        text={ovrText}
        font={ovrFont}
        color="#FFFFFF"
      />
      {(() => {
        cursor = startX + leftGroupW + gapBetween;
        const dividerX = cursor;
        const dividerY1 = baseY - 26;
        const dividerY2 = baseY + 16;
        cursor = dividerX + dividerW + gapBetween;
        return (
          <Group key="divider-and-right">
            <Path
              path={(() => {
                const p = Skia.Path.Make();
                p.moveTo(dividerX, dividerY1);
                p.lineTo(dividerX, dividerY2);
                return p;
              })()}
              style="stroke"
              strokeWidth={1.5}
              color="rgba(255,255,255,0.40)"
            />
            <SkText
              x={cursor}
              y={gradeBaselineY}
              text={grade}
              font={gradeFont}
              color="#FFFFFF"
            />
            {percentileText != null && (
              <SkText
                x={cursor + gradeW + 16}
                y={percentileBaselineY}
                text={percentileText}
                font={ovrLabelFont}
                color="rgba(255,255,255,0.78)"
              />
            )}
          </Group>
        );
      })()}
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
