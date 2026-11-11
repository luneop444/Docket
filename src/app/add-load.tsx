import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Fake, Gap, Option, T } from '../components/ui';
import { RECENT_STOPS } from '../logic/sampleData';
import { setsStopsOnce } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

type Source = 'share' | 'email';

/**
 * Figma B1 Add a load: share it the way it came in, no typing addresses.
 * Dedicated-route drivers see the same screen once, to set up their weekly stops.
 */
export default function AddLoad() {
  const { s } = useStore();
  const weekly = setsStopsOnce(s.loadStyle);
  const [source, setSource] = useState<Source>('share');
  return (
    <Screen
      header={<OnboardingBar onBack={() => (router.canGoBack() ? router.back() : router.navigate('/today'))} />}
      footer={
        <Button label="Continue" onPress={() => router.push({ pathname: '/check-stops', params: { source } })} />
      }
    >
      <T v="h2">{weekly ? 'Set up your weekly stops' : 'Add today’s load'}</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {weekly
          ? 'Share one rate con from your route. Docket keeps the stops and watches them on every run, so you won’t add loads again.'
          : 'Share it the way dispatch sent it. Docket reads the stops for you.'}
      </T>
      <Gap h={20} />
      <View style={{ gap: 8 }}>
        <Option
          radio
          label="Share from your dispatch app or a text"
          sub="Tap Share, then Docket. Screenshots work too."
          selected={source === 'share'}
          onPress={() => setSource('share')}
        />
        <Option
          radio
          label="Forward the rate con email"
          sub="Send it to loads@docket.app"
          selected={source === 'email'}
          onPress={() => setSource('email')}
        />
      </View>
      <Gap h={16} />
      {weekly ? null : <T v="bodyTiny">Been here before? Pick a recent stop: {RECENT_STOPS.join(', ')}.</T>}
      <Gap h={20} />
      <T v="bodyTiny">
        <Fake /> Continue stands in for receiving a shared rate con. Docket fills in a sample load.
      </T>
    </Screen>
  );
}
