import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { MinusIcon, PlusIcon } from '../components/Icons';
import { SheetShell } from '../components/Overlays';
import { Button, Card, Fake, Gap, Hr, Row, T } from '../components/ui';
import { clock } from '../logic/format';
import { SAMPLE_LOAD, WATCH_LEAD_MIN, type LoadStop } from '../logic/sampleData';
import { setsStopsOnce } from '../logic/state';
import { shiftStop } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { color, radius } from '../theme/tokens';

/** Figma B2 Check your stops: AI reads the rate con, driver checks it. One tap starts watching. */
export default function CheckStops() {
  const { s, a } = useStore();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const weekly = setsStopsOnce(s.loadStyle);
  const company = s.company?.split(' ')[0] ?? 'Your company';
  // Changing weekly stops starts from the saved ones; a new load starts from the rate con.
  const [stops, setStops] = useState<LoadStop[]>(() => s.load?.recurring && s.load.stops ? s.load.stops : SAMPLE_LOAD.stops);
  const [fixing, setFixing] = useState(false);
  const fixed = stops.some((st, i) => st.at !== SAMPLE_LOAD.stops[i]?.at);

  const rows: [string, string][] = [
    ...stops.map((st): [string, string] => [st.name, `${st.kind} ${clock(st.at)}`]),
    ['Detention rules', company],
    ['Watching starts', `${WATCH_LEAD_MIN / 60}h before each stop`],
    ...(weekly ? [['Repeats', 'Every run'] as [string, string]] : []),
  ];

  function start() {
    a.startWatching({
      number: SAMPLE_LOAD.number,
      source: source === 'email' ? 'email' : 'share',
      recurring: weekly,
      stops,
    });
    router.navigate('/today');
  }

  return (
    <View style={styles.flex}>
      <Screen
        header={<OnboardingBar onBack={() => router.navigate('/add-load')} />}
        footer={
          <>
            <Button label={weekly ? 'Looks right, use every run' : 'Looks right, start watching'} onPress={start} />
            <Button label="Fix a stop" variant="quiet" onPress={() => setFixing(true)} />
            <Button label="Not now" variant="text" onPress={() => router.navigate('/today')} />
          </>
        }
      >
        <T v="h2">{weekly ? 'Check your weekly stops' : 'Check your stops'}</T>
        <Gap h={8} />
        <T v="body" c={color.sub}>
          {weekly
            ? `Read from your rate con for load ${SAMPLE_LOAD.number}. Docket watches these stops on every run. Fix anything that looks off.`
            : `Read from your rate con for load ${SAMPLE_LOAD.number}. Fix anything that looks off.`}
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
          {fixed ? ' You changed a time.' : ''}
        </T>
      </Screen>
      {fixing ? (
        <SheetShell onClose={() => setFixing(false)}>
          <T v="h2">Fix a stop</T>
          <Gap h={6} />
          <T v="bodySmall">Change an appointment if the rate con got it wrong. Docket starts watching 3h before it.</T>
          <Gap h={16} />
          <View style={styles.times}>
            {stops.map((st, i) => (
              <View key={st.name} style={[styles.row, i < stops.length - 1 && styles.rowLine]}>
                <View style={styles.flex}>
                  <T v="bodyStrong" numberOfLines={1}>{st.name}</T>
                  <T v="bodyTiny">{st.kind}</T>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${st.name} 15 minutes earlier`}
                    onPress={() => setStops((x) => shiftStop(x, i, -1))}
                    style={styles.step}
                  >
                    <MinusIcon size={24} />
                  </Pressable>
                  <T v="bodyStrong" style={styles.value}>{clock(st.at)}</T>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${st.name} 15 minutes later`}
                    onPress={() => setStops((x) => shiftStop(x, i, 1))}
                    style={styles.step}
                  >
                    <PlusIcon size={24} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          <Gap h={8} />
          <T v="bodyTiny">Names and addresses come from the rate con. Editing them isn’t in the prototype yet.</T>
          <Gap h={16} />
          <Button label="Done" onPress={() => setFixing(false)} />
        </SheetShell>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  times: { backgroundColor: color.raise, borderRadius: radius.control, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingVertical: 8 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 76, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
