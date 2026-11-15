import { useFonts } from 'expo-font';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Squircles } from '../components/Squircles';
import { Overlays } from '../components/Overlays';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppStoreProvider, useStore } from '../state/AppStore';
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
          <Squircles />
        </PhoneFrame>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
