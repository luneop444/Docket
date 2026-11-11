import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneFrame } from '../components/PhoneFrame';
import { color, fontAssets } from '../theme/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // Render nothing until the brand font is ready, so text never flashes in a
  // fallback face. If loading fails, carry on with the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.bg },
          }}
        />
      </PhoneFrame>
    </SafeAreaProvider>
  );
}
