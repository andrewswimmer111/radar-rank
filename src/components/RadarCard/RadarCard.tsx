import {
  Canvas,
  type CanvasRef,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useMemo, type RefObject } from 'react';
import { View } from 'react-native';

import type { Template } from '@/data/types';
import type { ArchetypeResult } from '@/lib/archetype';

import {
  axisAngle,
  labelAnchor,
  labelOffset,
  radarPolygon,
  ringPolygon,
  type Point,
} from './geometry';

const LOGICAL_W = 1080;

const NAME_SIZE = 108;
const ARCHETYPE_SIZE = 60;
const TAGLINE_SIZE = 36;
const AXIS_SIZE = 30;
const SMALL_SIZE = 24;

type Draft = { name: string; scores: Record<string, number> };

export type RadarCardProps = {
  template: Template;
  draft: Draft;
  archetype: ArchetypeResult;
  width: number;
  height: number;
  canvasRef?: RefObject<CanvasRef | null>;
};

export function RadarCard({
  template,
  draft,
  archetype,
  width,
  height,
  canvasRef,
}: RadarCardProps) {
  const heroFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
    NAME_SIZE,
  );
  const headingFont = useFont(
    require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
    ARCHETYPE_SIZE,
  );
  const taglineFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    TAGLINE_SIZE,
  );
  const axisFont = useFont(
    require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    AXIS_SIZE,
  );
  const smallFont = useFont(
    require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    SMALL_SIZE,
  );

  const scale = width / LOGICAL_W;
  const logicalH = height / scale;

  const layout = useMemo(() => {
    const pad = LOGICAL_W * 0.09;
    const eyebrowY = pad + SMALL_SIZE;
    const nameY = eyebrowY + NAME_SIZE * 1.1;
    const topGap = LOGICAL_W * 0.04;
    const bottomBlockH = LOGICAL_W * 0.24;
    const radarTopY = nameY + topGap;
    const radarBottomY = logicalH - bottomBlockH;
    const radarRadius = Math.min(LOGICAL_W * 0.34, (radarBottomY - radarTopY) / 2);
    const center: Point = { x: LOGICAL_W / 2, y: (radarTopY + radarBottomY) / 2 };
    const archetypeY = radarBottomY + ARCHETYPE_SIZE;
    const taglineY = archetypeY + TAGLINE_SIZE * 1.4;
    const brandY = logicalH - pad;
    return {
      pad,
      eyebrowY,
      nameY,
      center,
      radarRadius,
      archetypeY,
      taglineY,
      brandY,
    };
  }, [logicalH]);

  if (!heroFont || !headingFont || !taglineFont || !axisFont || !smallFont) {
    return <View style={{ width, height, backgroundColor: '#1A1A22' }} />;
  }

  const scores = template.categories.map((c) => (draft.scores[c.key] ?? 50) / 100);

  const ringFractions = [0.25, 0.5, 0.75, 1.0];
  const ringPaths = ringFractions.map((f) =>
    polylineToPath(ringPolygon(layout.center, layout.radarRadius, scores.length, f), true),
  );

  const spokePath = (() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < scores.length; i++) {
      const a = axisAngle(i, scores.length);
      p.moveTo(layout.center.x, layout.center.y);
      p.lineTo(
        layout.center.x + layout.radarRadius * Math.cos(a),
        layout.center.y + layout.radarRadius * Math.sin(a),
      );
    }
    return p;
  })();

  const dataPath = polylineToPath(
    radarPolygon(layout.center, layout.radarRadius, scores),
    true,
  );

  const upperName = (draft.name || ' ').toUpperCase();
  const nameDisplay = trim(upperName, heroFont, LOGICAL_W - layout.pad * 2);
  const nameX = layout.pad;

  const archetypeDisplay = archetype.name;
  const archetypeWidth = headingFont.measureText(archetypeDisplay).width;
  const archetypeX = (LOGICAL_W - archetypeWidth) / 2;

  const taglineDisplay = `“${archetype.tagline}”`;
  const taglineWidth = taglineFont.measureText(taglineDisplay).width;
  const taglineX = (LOGICAL_W - taglineWidth) / 2;

  const eyebrowText = template.label.toUpperCase();
  const eyebrowX = layout.pad;

  const brandText = 'RADARRANK';
  const brandWidth = smallFont.measureText(brandText).width;
  const brandX = LOGICAL_W - layout.pad - brandWidth;
  const brandLeftText = `#${template.id}`;
  const brandLeftX = layout.pad;

  return (
    <View
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: width * 0.05,
        backgroundColor: '#0B0B10',
      }}>
      <Canvas style={{ width, height }} ref={canvasRef}>
        <Group transform={[{ scale }]}>
          {/* Background gradient */}
          <Rect x={0} y={0} width={LOGICAL_W} height={logicalH}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(LOGICAL_W, logicalH)}
              colors={[template.accent.start, template.accent.end]}
            />
          </Rect>

          {/* Dark vignette toward bottom for text contrast */}
          <Rect x={0} y={0} width={LOGICAL_W} height={logicalH}>
            <LinearGradient
              start={vec(LOGICAL_W * 0.5, 0)}
              end={vec(LOGICAL_W * 0.5, logicalH)}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
              positions={[0, 0.45, 1]}
            />
          </Rect>

          {/* Glow orb behind radar */}
          <Group opacity={0.45}>
            <Rect
              x={layout.center.x - layout.radarRadius * 1.4}
              y={layout.center.y - layout.radarRadius * 1.4}
              width={layout.radarRadius * 2.8}
              height={layout.radarRadius * 2.8}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(layout.radarRadius * 2.8, layout.radarRadius * 2.8)}
                colors={[template.accent.glow + 'AA', 'rgba(0,0,0,0)']}
              />
            </Rect>
          </Group>

          {/* Radar rings */}
          {ringPaths.map((p, i) => (
            <Path
              key={`ring-${i}`}
              path={p}
              style="stroke"
              strokeWidth={1.5}
              color={`rgba(255,255,255,${0.08 + i * 0.04})`}
            />
          ))}

          {/* Spokes */}
          <Path path={spokePath} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.18)" />

          {/* Data polygon fill */}
          <Path path={dataPath} style="fill" color="rgba(255,255,255,0.18)" />

          {/* Data polygon stroke */}
          <Path
            path={dataPath}
            style="stroke"
            strokeWidth={4}
            strokeJoin="round"
            color="#FFFFFF"
          />

          {/* Axis labels */}
          {template.categories.map((cat, i) => {
            const a = axisAngle(i, scores.length);
            const anchor = labelAnchor(layout.center, layout.radarRadius, a, 28);
            const label = cat.label.toUpperCase();
            const tw = axisFont.measureText(label).width;
            const { x, y } = labelOffset(anchor, a, tw, AXIS_SIZE * 0.7);
            return (
              <SkText
                key={cat.key}
                x={x}
                y={y}
                text={label}
                font={axisFont}
                color="rgba(255,255,255,0.92)"
              />
            );
          })}

          {/* Eyebrow */}
          <SkText
            x={eyebrowX}
            y={layout.eyebrowY}
            text={eyebrowText}
            font={smallFont}
            color="rgba(255,255,255,0.7)"
          />

          {/* Name */}
          <SkText
            x={nameX}
            y={layout.nameY}
            text={nameDisplay}
            font={heroFont}
            color="#FFFFFF"
          />

          {/* Archetype */}
          <SkText
            x={archetypeX}
            y={layout.archetypeY}
            text={archetypeDisplay}
            font={headingFont}
            color="#FFFFFF"
          />

          {/* Tagline */}
          <SkText
            x={taglineX}
            y={layout.taglineY}
            text={taglineDisplay}
            font={taglineFont}
            color="rgba(255,255,255,0.78)"
          />

          {/* Brand row */}
          <SkText
            x={brandLeftX}
            y={layout.brandY}
            text={brandLeftText}
            font={smallFont}
            color="rgba(255,255,255,0.55)"
          />
          <SkText
            x={brandX}
            y={layout.brandY}
            text={brandText}
            font={smallFont}
            color="rgba(255,255,255,0.85)"
          />
        </Group>
      </Canvas>
    </View>
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

function trim(text: string, font: ReturnType<typeof useFont> & object, maxWidth: number): string {
  if (!font) return text;
  let display = text;
  while (display.length > 1 && font.measureText(display).width > maxWidth) {
    display = display.slice(0, -1);
  }
  if (display.length < text.length) display = display.slice(0, -1) + '…';
  return display;
}
