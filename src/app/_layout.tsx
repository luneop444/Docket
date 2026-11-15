import { useFonts } from 'expo-font';
import { router, Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Squircles } from '../components/Squircles';
import { TextWrap } from '../components/TextWrap';
import { Overlays } from '../components/Overlays';
import { PhoneFrame } from '../components/PhoneFrame';
import { isDemoState } from '../logic/demo';
import { AppStoreProvider, useStore } from '../state/AppStore';
import { LocationWatcher } from '../state/location';
import { color, fontAssets } from '../theme/tokens';

const ONBOARDING = ['/welcome', '/company', '/company-rules', '/edit-rules', '/loads', '/location'];

/** Like v1: until onboarding is finished, every other screen goes to Welcome. */
function OnboardingGuard() {
  const { s } = useStore();
  const path = usePathname();
  // A demo link (/today?state=paid) sets up its own sample driver, so it skips onboarding.
  const demo = isDemoState(useGlobalSearchParams<{ state?: string }>().state);
  useEffect(() => {
    if (!demo && !s.onboarded && path !== '/' && !ONBOARDING.includes(path)) router.replace('/welcome');
  }, [demo, s.onboarded, path]);
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
          <TextWrap />
        </PhoneFrame>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
