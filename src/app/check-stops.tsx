import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { SheetShell } from '../components/Overlays';
import { Switch } from '../components/RuleEditor';
import { blankStop, StopsEditor, stopsReady } from '../components/StopsEditor';
import { Button, Card, Fake, Gap, Hr, Row, T } from '../components/ui';
import { clock } from '../logic/format';
import { SAMPLE_LOAD, WATCH_LEAD_MIN, type LoadStop } from '../logic/sampleData';
import { setsStopsOnce } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/**
 * Figma B2 Check your stops: AI reads the rate con, driver checks it. One tap starts watching.
 * With source=manual the driver types the load in instead.
 */
export default function CheckStops() {
  const { s, a } = useStore();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const manual = source === 'manual';
  const mix = s.loadStyle === 'mix';
  // Mixed drivers choose per load whether these are their weekly stops.
  const [saveWeekly, setSaveWeekly] = useState(() => mix && !!s.load?.recurring);
  const weekly = setsStopsOnce(s.loadStyle) || (mix && saveWeekly);
  const company = s.company?.split(' ')[0] ?? 'Your company';
  // Changing weekly stops starts from the saved ones; a new load from the rate con, or blank when typed in.
  const editingSaved = !!(s.load?.recurring && s.load.stops);
  const [number, setNumber] = useState(() => (editingSaved ? s.load!.number : manual ? '' : SAMPLE_LOAD.number));
  const [stops, setStops] = useState<LoadStop[]>(() =>
    editingSaved ? s.load!.stops! : manual ? [blankStop('Drop', 8 * 60)] : SAMPLE_LOAD.stops,
  );
  const [fixing, setFixing] = useState(false);
  const fixed = stops.length !== SAMPLE_LOAD.stops.length || stops.some((st, i) => st.at !== SAMPLE_LOAD.stops[i]?.at || st.name !== SAMPLE_LOAD.stops[i]?.name);
  const ready = stopsReady(stops);
  // Typed in from scratch: edit right on the page.
  const inline = manual && !editingSaved;

  const rows: [string, string][] = [
    ...stops.map((st): [string, string] => [st.name || 'Unnamed stop', `${st.kind} ${clock(st.at)}`]),
    ['Detention rules', company],
    ['Watching starts', `${WATCH_LEAD_MIN / 60}h before each stop`],
    ...(weekly ? [['Repeats', 'Every run'] as [string, string]] : []),
  ];

  function start() {
    a.startWatching({
      number: number.trim(),
      source: manual ? 'manual' : source === 'email' ? 'email' : 'share',
      recurring: weekly,
      stops: stops.map((st) => ({ ...st, name: st.name.trim() })),
    });
    router.navigate('/today');
  }

  const startLabel = weekly ? 'Use every run' : 'Start watching';
  const weeklySwitch = mix ? (
    <>
      <Gap h={12} />
      <Card>
        <Row>
          <View style={styles.flex}>
            <T v="bodyStrong">Same stops every week</T>
            <T v="bodyTiny">Save these as your weekly route so you don’t add them again.</T>
          </View>
          <Switch on={saveWeekly} onChange={setSaveWeekly} />
        </Row>
      </Card>
    </>
  ) : null;

  if (inline) {
    return (
      <Screen
        header={<OnboardingBar onBack={() => router.navigate('/add-load')} />}
        footer={
          <>
            <Button label={startLabel} disabled={!ready} onPress={start} />
            <Button label="Not now" variant="text" onPress={() => router.navigate('/today')} />
          </>
        }
      >
        <T v="h2">{weekly ? 'Type in your weekly stops' : 'Type in your load'}</T>
        <Gap h={8} />
        <T v="body" c={color.sub}>
          The facility names and appointment times from your rate con. Docket watches the last drop.
        </T>
        <Gap h={24} />
        <StopsEditor number={number} onNumber={setNumber} stops={stops} onStops={setStops} />
        {weeklySwitch}
        {!ready ? (
          <>
            <Gap h={8} />
            <T v="bodyTiny">Name every stop to start watching.</T>
          </>
        ) : null}
      </Screen>
    );
  }

  return (
    <View style={styles.flex}>
      <Screen
        header={<OnboardingBar onBack={() => router.navigate('/add-load')} />}
        footer={
          <>
            <Button label={`Looks right, ${startLabel.toLowerCase()}`} disabled={!ready} onPress={start} />
            <Button label="Fix a stop" variant="quiet" onPress={() => setFixing(true)} />
            <Button label="Not now" variant="text" onPress={() => router.navigate('/today')} />
          </>
        }
      >
        <T v="h2">{weekly ? 'Check your weekly stops' : 'Check your stops'}</T>
        <Gap h={8} />
        <T v="body" c={color.sub}>
          {editingSaved
            ? 'Your saved weekly stops. Docket watches these on every run. Fix anything that’s changed.'
            : `Read from your rate con${number ? ` for load ${number}` : ''}.${weekly ? ' Docket watches these stops on every run.' : ''} Fix anything that looks off.`}
        </T>
        <Gap h={24} />
        <Card>
          {rows.map(([label, value], i) => (
            <Fragment key={i}>
              {i > 0 ? <Hr style={{ marginVertical: 8 }} /> : null}
              <Row style={{ minHeight: 40 }}>
                <T v="bodySmall" numberOfLines={1} style={styles.flex}>{label}</T>
                <T v="bodyStrong">{value}</T>
              </Row>
            </Fragment>
          ))}
        </Card>
        {weeklySwitch}
        <Gap h={12} />
        {editingSaved ? null : (
          <T v="bodyTiny">
            <Fake label="Sample data" /> Reading the rate con is faked. These stops come from a sample load.
            {fixed ? ' You changed it.' : ''}
          </T>
        )}
      </Screen>
      {fixing ? (
        <SheetShell scroll onClose={() => setFixing(false)}>
          <T v="h2">Fix a stop</T>
          <Gap h={6} />
          <T v="bodySmall">Change anything the rate con got wrong.</T>
          <Gap h={16} />
          <StopsEditor number={number} onNumber={setNumber} stops={stops} onStops={setStops} />
          <Gap h={16} />
          <Button label="Done" disabled={!ready} onPress={() => setFixing(false)} />
        </SheetShell>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
});
