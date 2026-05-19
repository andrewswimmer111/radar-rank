# RadarRank

A single-player radar-card generator. Pick a template, drag the sliders, get a witty archetype, export a polished PNG for social.

## Run

```bash
npm install
npx expo start
```

Targets iOS Simulator and Android. Built on Expo SDK 55.

## Stack

- Expo SDK 55 + expo-router (file-based routing)
- `@shopify/react-native-skia` — card rendering + PNG snapshot
- `@react-native-community/slider` — system slider control
- `expo-sharing` + `expo-media-library` + `expo-file-system` — export pipeline
- `react-native-reanimated` — entrance animations
- `@expo-google-fonts/{bricolage-grotesque,inter}` — typography

## Project shape

```
src/
  app/                      file-based routes
    _layout.tsx             root stack + font gate + splash
    index.tsx               template picker
    create/
      _layout.tsx           wraps /create with DraftProvider
      [templateId]/
        index.tsx           slider edit screen
        result.tsx          card preview + Save/Share
  components/
    RadarCard/              Skia card (preview + export size)
    TemplateCard.tsx        picker card with gradient
    SliderRow.tsx           styled slider row
    AspectToggle.tsx        Square/Story segmented control
    HeaderBar.tsx           shared header with back button
  data/
    types.ts                Template, Category, ArchetypeRule
    templates.ts            the 3 templates and their rules
  lib/
    archetype.ts            pickArchetype() — pure scorer
    exportCard.ts           Skia snapshot → file URI
  state/
    DraftProvider.tsx       useReducer-based draft context
  design/
    tokens.ts               colors, spacing, type
    useAppFonts.ts          font loader
scripts/
  verify-archetypes.ts      sanity check across score regimes
```

## Adding a template

Templates are pure data. To add one, append a `Template` entry to `src/data/templates.ts`:

```ts
{
  id: 'your-id',
  label: 'Your Label',
  blurb: 'short pitch',
  emoji: '🧠',
  accent: { start: '#hex', end: '#hex', glow: '#hex' },
  categories: [
    { key: 'category_key', label: 'Display Name' },
    // 5–8 entries
  ],
  archetypes: [
    {
      name: 'The Archetype',
      tagline: 'one-liner',
      weights: { category_key: 1.0, other_key: -0.5 },
      // bias optional; pickArchetype maximizes weighted fitness
    },
    // ~6–10 archetypes
  ],
}
```

Verify your rules cover the four score regimes:

```bash
node --experimental-strip-types scripts/verify-archetypes.ts
```

The script checks each template produces ≥3 distinct archetypes across {all-high, all-low, lopsided-strength, lopsided-weakness} and that every weight key exists.

## Export pipeline

The result screen mounts a second, off-screen `<RadarCard>` at 1080-wide export resolution with a `canvasRef`. Save / Share call `snapshotCanvasToFile` (`src/lib/exportCard.ts`), which calls `canvas.makeImageSnapshotAsync()` and writes the PNG bytes to a cache file via `expo-file-system`. The cache URI is then handed to `expo-media-library` or `expo-sharing`.

Story format (9:16) and square (1:1) share the same component — only the `height` prop changes.

## Out of scope (sprint 1)

No auth, no feed, no cloud, no per-user history. Templates are static. The radar card is the deliverable.
