// Registers the background location task before anything else runs (Expo Router note in the TaskManager docs).
import '../state/background';
import { useFonts } from 'expo-font';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStack } from '../components/AppStack';
import { Squircles } from '../components/Squircles';
import { TextWrap } from '../components/TextWrap';
import { LiveActivityBridge } from '../components/LiveActivityBridge';
import { Overlays } from '../components/Overlays';
import { PhoneFrame } from '../components/PhoneFrame';
import { setupAllows, setupStep } from '../logic/state';
import { AppStoreProvider, useStore } from '../state/AppStore';
import { BackgroundSync } from '../state/BackgroundSync';
import { LocationWatcher } from '../state/location';
import { fontAssets } from '../theme/tokens';

/**
 * Setup can't be skipped (P1 reached Claims without it, 24 Nov): until the name, the company and
 * the rules are in, every screen goes to the setup step the driver is on, and setup screens can't
 * be jumped ahead. Deep links and old demo links (?state=) get no way round it.
 */
function OnboardingGuard() {
  const { s } = useStore();
  const path = usePathname();
  useEffect(() => {
    const step = setupStep(s);
    if (step && path !== '/' && !setupAllows(s, path)) router.replace(s.name ? step : '/welcome');
  }, [s, path]);
  return null;
}

/** Each screen's browser title, so a tab, a bookmark or a screen reader names it (WCAG 2.4.2). */
const TITLES: Record<string, string> = {
  '/welcome': 'Welcome',
  '/account': 'Your name',
  '/company': 'Who do you drive for?',
  '/edit-rules': 'Detention rules',
  '/rules': 'Detention rules',
  '/location': 'Notice your stops',
  '/today': 'Today',
  '/paycheck': 'Claims',
  '/companies': 'Companies',
  '/add-load': 'Add today’s load',
  '/bol': 'Bill of lading',
  '/summary': 'Stop summary',
  '/settlement': 'Check a settlement',
  '/claim': 'Claim',
  '/claim-sheet': 'Claim',
  '/check-stops': 'Check your stops',
  '/history': 'Your stops',
};

function PageTitle() {
  const path = usePathname();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const t = TITLES[path];
    const title = t ? `${t} · Docket` : 'Docket';
    // After the router's own title pass, which would set the app name back.
    const id = setTimeout(() => (document.title = title), 0);
    return () => clearTimeout(id);
  }, [path]);
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
          <AppStack />
          <Overlays />
          <OnboardingGuard />
          <PageTitle />
          <LocationWatcher />
          <BackgroundSync />
          <LiveActivityBridge />
          <Squircles />
          <TextWrap />
        </PhoneFrame>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
