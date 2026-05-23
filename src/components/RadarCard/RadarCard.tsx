import {
  Canvas,
  type CanvasRef,
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
import { useMemo, type RefObject } from 'react';
import { View } from 'react-native';

import { RadarChart } from '@/components/RadarChart';
import type { Template } from '@/data/types';
import {
  gradeFromScore,
  overallScore,
  percentileAmong,
  profileArchetype,
} from '@/lib/stats';

import { type Point } from './geometry';

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
    eyebrowFont &&
    footerFont &&
    ovrFont &&
    ovrLabelFont &&
    gradeFont;

  if (!fontsReady) {
    return <View style={{ width, height, backgroundColor: '#101018' }} />;
  }

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

          {/* Chart layer — rings, spokes, polygon, vertices, axis labels */}
          <RadarChart
            center={layout.center}
            radius={layout.radarRadius}
            categories={template.categories}
            series={[
              { id: 'self', scores: draft.scores, color: template.accent.glow },
            ]}
            glowColor={template.accent.glow}
            animateIn={!canvasRef}
          />

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
