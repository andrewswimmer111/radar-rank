# RadarRank

A single-player radar-card generator. Pick a template, drag the sliders, export a polished PNG for social.

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
    types.ts                Template, Category
    templates.ts            the 3 templates
  lib/
    exportCard.ts           Skia snapshot → file URI
  state/
    DraftProvider.tsx       useReducer-based draft context
  design/
    tokens.ts               colors, spacing, type
    useAppFonts.ts          font loader
```