import { useFonts as useExpoFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Inter_700Bold } from '@expo-google-fonts/inter';

export function useFonts() {
  return useExpoFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    DMSans_700Bold,
    Inter_700Bold,
  });
}
