import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen, TopBar } from '../components/Chrome';
import { ChecklistIcon, DocIcon, LocationIcon } from '../components/Icons';
import { Button, Gap, IconRow, Row, T, TimeBar } from '../components/ui';
import { fontFamily } from '../theme/tokens';

/** v1 01 Welcome */
export default function Welcome() {
  return (
    <Screen header={<TopBar />} footer={<Button label="Get started" onPress={() => router.push('/company')} />}>
      <Gap h={24} />
      <T v="h1">Know what you’re owed for every hour at the dock.</T>
      <Gap h={32} />
      <Row>
        <T v="bodyTiny">Arrive 1:48 PM</T>
        <T v="bodyTiny">Leave 6:10 PM</T>
      </Row>
      <Gap h={8} />
      <TimeBar free={120} detention={142} height={8} />
      <Gap h={8} />
      <Row>
        <T v="bodyTiny">2h free time</T>
        <T v="labelSmall" style={{ fontFamily: fontFamily.semibold }}>
          2h 22m you should be paid for
        </T>
      </Row>
      <Gap h={32} />
      {/* Onboarding v3: icon rows instead of a numbered paragraph list. */}
      <View style={{ gap: 18 }}>
        <IconRow icon={(c) => <LocationIcon c={c} />} label="Notices your stops" sub="When you pull in and leave. You just confirm" />
        <IconRow icon={(c) => <ChecklistIcon c={c} />} label="Applies your company’s rules" sub="Free time, rate and breaks, on every wait" />
        <IconRow icon={(c) => <DocIcon c={c} size={20} />} label="Checks your paycheck" sub="Which loads to look for, and how much" />
      </View>
      <Gap h={24} />
      {/* Audit #1: the old line ("stays on your phone") wasn't true once BOL and settlement scans went to the AI reader. */}
      <T v="bodyTiny">
        The times and pay you enter stay on your phone. Photos you choose to scan are sent once to be read by AI, not
        stored, and never shared with your company.
      </T>
    </Screen>
  );
}
