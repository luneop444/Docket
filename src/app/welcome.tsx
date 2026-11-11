import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen, TopBar } from '../components/Chrome';
import { Button, Gap, Row, StepItem, T, TimeBar } from '../components/ui';
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
      <View style={{ gap: 14 }}>
        <StepItem badge="1">Notices when you arrive at and leave a stop on your load. You just confirm.</StepItem>
        <StepItem badge="2">Applies your company’s detention rules to every wait.</StepItem>
        <StepItem badge="3">Shows you which loads to look for on your settlement, and how much.</StepItem>
      </View>
      <Gap h={24} />
      <T v="bodyTiny">Your pay information stays on your phone. Your company never sees it.</T>
    </Screen>
  );
}
