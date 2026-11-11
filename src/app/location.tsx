import { router } from 'expo-router';
import { View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { ShieldIcon } from '../components/Icons';
import { Button, Fake, Gap, StepItem, T } from '../components/ui';
import type { LocationMode } from '../logic/state';
import { useStore } from '../state/AppStore';

/** v1 06 Location permission */
export default function LocationPermission() {
  const { s, a } = useStore();
  function finish(mode: LocationMode) {
    a.finishOnboarding(mode);
    router.replace('/today');
  }
  return (
    <Screen
      header={<BackBar onPress={() => router.navigate(s.customCompany ? '/edit-rules' : '/company-rules')} />}
      footer={
        <>
          <Button label="Allow “Always”" onPress={() => finish('always')} />
          <Button label="I’ll tap in and out myself" variant="text" onPress={() => finish('manual')} />
        </>
      }
    >
      <T v="h2">Let Docket log your stops</T>
      <Gap h={8} />
      <T v="bodySmall">
        Set location to “Always” so Docket can note when you reach and leave a facility, without you touching your phone.
      </T>
      <Gap h={24} />
      <View style={{ gap: 14 }}>
        <StepItem badge={<ShieldIcon />}>Only records near the shippers and receivers on your loads.</StepItem>
        <StepItem badge={<ShieldIcon />}>Never shares where you are with {s.company || 'your company'}.</StepItem>
        <StepItem badge={<ShieldIcon />}>You can fix any time it gets wrong.</StepItem>
      </View>
      <Gap h={24} />
      <T v="bodyTiny">
        <Fake label="Simulated" /> A web prototype can’t track location in the background. In this version, buttons on
        the Today screen stand in for arriving and leaving.
      </T>
    </Screen>
  );
}
