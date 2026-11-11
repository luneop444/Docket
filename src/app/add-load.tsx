import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Fake, Gap, Option, T } from '../components/ui';
import { RECENT_STOPS } from '../logic/sampleData';
import { color } from '../theme/tokens';

type Source = 'share' | 'email';

/** Figma B1 Add a load: share it the way it came in, no typing addresses. */
export default function AddLoad() {
  const [source, setSource] = useState<Source>('share');
  return (
    <Screen
      header={<OnboardingBar onBack={() => router.navigate('/today')} />}
      footer={
        <Button label="Continue" onPress={() => router.push({ pathname: '/check-stops', params: { source } })} />
      }
    >
      <T v="h2">Add today’s load</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>Share it the way dispatch sent it. Docket reads the stops for you.</T>
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
      <T v="bodyTiny">Been here before? Pick a recent stop: {RECENT_STOPS.join(', ')}.</T>
      <Gap h={20} />
      <T v="bodyTiny">
        <Fake /> Continue stands in for receiving a shared rate con. Docket fills in a sample load.
      </T>
    </Screen>
  );
}
