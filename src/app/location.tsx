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
          {/* Audit #2: two equal choices. Before, "Allow location" was the filled button and the manual path a small text link. */}
          <Button label="Notice my stops for me" variant="quiet" onPress={() => finish('always')} />
          <Button label="I’ll tap “I’m here” myself" variant="quiet" onPress={() => finish('manual')} />
        </>
      }
    >
      <T v="h2">Let Docket notice your stops</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        Docket can notice when you pull in and leave, even with the app closed. That needs “Always” location. Or tap
        “I’m here” at each stop and Docket never uses location. Both time your stops the same way, and you can switch
        anytime in Your rules.
      </T>
      <Gap h={24} />
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
        first time you tap “I’m here” there. The iPhone app keeps watching with Docket closed.
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
