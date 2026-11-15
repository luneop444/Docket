// Registers the background location task before anything else runs (Expo Router note in the TaskManager docs).
import '../state/background';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Overlays } from '../components/Overlays';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppStoreProvider, useStore } from '../state/AppStore';
import { BackgroundSync } from '../state/BackgroundSync';
import { LocationWatcher } from '../state/location';
import { color, fontAssets } from '../theme/tokens';

const ONBOARDING = ['/welcome', '/company', '/company-rules', '/edit-rules', '/loads', '/location'];

/** Like v1: until onboarding is finished, every other screen goes to Welcome. */
function OnboardingGuard() {
  const { s } = useStore();
  const path = usePathname();
  useEffect(() => {
    if (!s.onboarded && path !== '/' && !ONBOARDING.includes(path)) router.replace('/welcome');
  }, [s.onboarded, path]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // Render nothing until the brand font is ready, so text never flashes in a
  // fallback face. If loading fails, carry on with the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <PhoneFrame>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: color.bg },
            }}
          />
          <Overlays />
          <OnboardingGuard />
          <LocationWatcher />
          <BackgroundSync />
        </PhoneFrame>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
