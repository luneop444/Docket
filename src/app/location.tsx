import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { resetStepMotion } from '../components/stepMotion';
import { CheckIcon } from '../components/Icons';
import { Button, Card, Fake, Gap, T } from '../components/ui';
import type { LocationMode } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

const PROMISES = [
  'Only on while you have a load, and only near its stops.',
  'You’ll see it in the Dynamic Island whenever it’s on.',
  'Turns off after your last stop. Never shared with your company.',
];

/** Figma A4 Location permission: states the guardrails before asking. */
export default function LocationPermission() {
  const { a } = useStore();
  function finish(mode: LocationMode) {
    a.finishOnboarding(mode);
    resetStepMotion();
    router.replace('/today');
  }
  return (
    <Screen
      step={4}
      header={<OnboardingBar step={4} onBack={() => router.navigate('/loads')} />}
      footer={
        <>
          <Button label="Allow location" onPress={() => finish('always')} />
          <Button label="I’ll log stops by hand" variant="text" onPress={() => finish('manual')} />
        </>
      }
    >
      <T v="h2">Let Docket notice your stops</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        Choose “Always” so Docket can notice when you pull in, even with the app closed.
      </T>
      <Gap h={20} />
      <Card style={styles.promises}>
        {PROMISES.map((p) => (
          <View key={p} style={styles.row}>
            <View style={styles.check}>
              <CheckIcon c={color.ink} size={18} />
            </View>
            <T v="body" style={styles.flex}>{p}</T>
          </View>
        ))}
      </Card>
      <Gap h={20} />
      <T v="bodyTiny">
        <Fake label="Web" /> In the browser Docket only sees location while the app is open. It learns each stop the
        first time you tap “I’m here” there. Background tracking comes with the iPhone app.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  promises: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  check: { paddingTop: 2 },
});
