import { Stack } from 'expo-router';

import { DraftProvider } from '@/state/DraftProvider';

export default function CreateLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </DraftProvider>
  );
}
