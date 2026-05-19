import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  return loaded;
}
