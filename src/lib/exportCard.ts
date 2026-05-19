import { type CanvasRef } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import type { RefObject } from 'react';

export async function snapshotCanvasToFile(
  canvasRef: RefObject<CanvasRef | null>,
  filename: string,
): Promise<string> {
  const canvas = canvasRef.current;
  if (!canvas) throw new Error('canvas not ready');

  const image = await canvas.makeImageSnapshotAsync();
  if (!image) throw new Error('snapshot failed');

  const bytes = image.encodeToBytes();
  if (!bytes) throw new Error('encode failed');

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

export function exportFilename(templateId: string): string {
  const ts = Date.now();
  return `radarrank-${templateId}-${ts}.png`;
}
