import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Card, Fake, Gap, Hr, Row, T } from '../components/ui';
import { clock } from '../logic/format';
import { SAMPLE_LOAD, WATCH_LEAD_MIN } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/** Figma B2 Check your stops: AI reads the rate con, driver checks it. One tap starts watching. */
export default function CheckStops() {
  const { s, a } = useStore();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const company = s.company?.split(' ')[0] ?? 'Your company';

  const rows: [string, string][] = [
    ...SAMPLE_LOAD.stops.map((st): [string, string] => [st.name, `${st.kind} ${clock(st.at)}`]),
    ['Detention rules', company],
    ['Watching starts', `${WATCH_LEAD_MIN / 60}h before each stop`],
  ];

  function start() {
    a.startWatching({ number: SAMPLE_LOAD.number, source: source === 'email' ? 'email' : 'share' });
    router.navigate('/today');
  }

  return (
    <Screen
      header={<OnboardingBar onBack={() => router.navigate('/add-load')} />}
      footer={
        <>
          <Button label="Looks right, start watching" onPress={start} />
          <Button
            label="Fix a stop"
            variant="quiet"
            onPress={() => a.toast('Fixing a stop isn’t in the prototype yet.')}
          />
          <Button label="Not now" variant="text" onPress={() => router.navigate('/today')} />
        </>
      }
    >
      <T v="h2">Check your stops</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        Read from your rate con for load {SAMPLE_LOAD.number}. Fix anything that looks off.
      </T>
      <Gap h={20} />
      <Card>
        {rows.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 ? <Hr style={{ marginVertical: 8 }} /> : null}
            <Row style={{ minHeight: 40 }}>
              <T v="bodySmall">{label}</T>
              <T v="bodyStrong">{value}</T>
            </Row>
          </Fragment>
        ))}
      </Card>
      <Gap h={12} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Reading the rate con is faked. These stops come from a sample load.
      </T>
    </Screen>
  );
}
