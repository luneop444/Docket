import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { resetStepMotion } from '../components/stepMotion';
import { EyeSlashIcon, HandTapIcon, IslandIcon, LocationIcon } from '../components/Icons';
import { ActionCard, Fake, Gap, IconRow, T } from '../components/ui';
import { keepLast } from '../logic/format';
import type { LocationMode } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/**
 * Figma A4 Location permission, redrawn as Onboarding v3 P-A "weighted choices"
 * (344:861): the guardrails as icon rows, then two whole choices. "For me" is
 * the ink card; "myself" is an outlined card with its own title, line and
 * chevron, not a small text link, so turning location down is just as easy
 * to find (Audit #2).
 */
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
          {/* A limit of the web prototype, so it wears the prototype's own tag, like every
              other prototype note, not lime, which means selected or yours. */}
          <T v="bodyTiny">
            <Fake label="Web" /> {keepLast('In the browser, only while Docket is open')}
          </T>
          <Gap h={2} />
          <ActionCard
            primary
            icon={(c) => <LocationIcon c={c} size={22} filled />}
            label="Notice my stops for me"
            sub="Uses “Always” location"
            onPress={() => finish('always')}
          />
          <ActionCard
            icon={(c) => <HandTapIcon c={c} />}
            label="I’ll tap “I’m here” myself"
            sub="Location stays off"
            onPress={() => finish('manual')}
          />
        </>
      }
    >
      <T v="h2">Let Docket notice your stops</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        Times your stops the same either way. Switch anytime in Your rules.
      </T>
      <Gap h={28} />
      <View style={styles.promises}>
        <IconRow icon={(c) => <LocationIcon c={c} />} label="Only during a load" sub="Off after your last stop" />
        <IconRow icon={(c) => <IslandIcon c={c} />} label="Always visible" sub="Shows in the Dynamic Island" />
        <IconRow icon={(c) => <EyeSlashIcon c={c} />} label="Never shared" sub="Your company can’t see it" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promises: { gap: 18 },
});
