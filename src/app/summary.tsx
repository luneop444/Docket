import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Card, Fake, Gap, Row, T } from '../components/ui';
import { clock, dur, money } from '../logic/format';
import { placeOf } from '../logic/state';
import { bolGap, bolTimesOf, stopCalc } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { color, fontFamily, type } from '../theme/tokens';

/** A time, with the original location time struck through if the driver fixed it. */
function TimeCell({ cur, orig }: { cur: number | null; orig?: number }) {
  if (cur == null) return <Text style={styles.td}>—</Text>;
  return (
    <Text style={styles.td}>
      {orig != null && orig !== cur ? <Text style={styles.struck}>{clock(orig)} </Text> : null}
      {clock(cur)}
    </Text>
  );
}

function TRow({ label, loc, bol }: { label: string; loc: ReactNode; bol: ReactNode }) {
  return (
    <View style={styles.tr}>
      <Text style={[styles.td, styles.first]}>{label}</Text>
      <View style={styles.cell}>{loc}</View>
      <View style={styles.cell}>{bol}</View>
    </View>
  );
}

const None = ({ text = 'None' }: { text?: string }) => <Text style={[styles.td, styles.none]}>{text}</Text>;

/** v1 11 Stop summary (+ 12 Fix a time sheet) */
export default function StopSummary() {
  const { s, a } = useStore();
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);
  const bol = bolTimesOf(st);
  const gap = bolGap(st);
  const orig = st.edited;

  return (
    <Screen
      header={<BackBar label="Today" onPress={() => router.navigate('/today')} />}
      footer={
        <>
          <Button label="Done" onPress={() => router.navigate('/today')} />
          <Button label="Fix a time" variant="text" onPress={a.openFix} />
        </>
      }
    >
      <T v="bodySmall">Stop logged{placeOf(s.load).load ? ` for load ${placeOf(s.load).load}` : ''}</T>
      <Gap h={8} />
      <T v="h2">{placeOf(s.load).name}</T>
      <Gap h={24} />
      <Card>
        <View style={styles.thead}>
          <Text style={[styles.th, styles.first]} />
          <Text style={styles.th}>Location</Text>
          <Text style={styles.th}>
            BOL {bol?.sample ? <Fake label="Sample" /> : null}
          </Text>
        </View>
        <TRow label="In" loc={<TimeCell cur={st.arrive} orig={orig?.arrive} />} bol={bol && bol.in != null ? <TimeCell cur={bol.in} /> : <None />} />
        <TRow label="Checked in" loc={<TimeCell cur={st.checkin} />} bol={<None text="—" />} />
        {st.brk ? <TRow label="Off-duty break" loc={<Text style={styles.td}>{dur(st.brk)}</Text>} bol={<None text="—" />} /> : null}
        <TRow label="Out" loc={<TimeCell cur={st.leave} orig={orig?.leave} />} bol={bol && bol.out != null ? <TimeCell cur={bol.out} /> : <None />} />
        <T v="bodyTiny" style={{ marginTop: 8 }}>
          {!st.bol
            ? 'Location times only. No BOL photo.'
            : gap == null
              ? `No times read off the BOL.${st.bolTimes?.note ? ` ${st.bolTimes.note}` : ''}`
              : gap <= 15
                ? `Location and BOL times agree within ${Math.max(1, Math.round(gap))} minute${Math.round(gap) > 1 ? 's' : ''}.`
                : `Location and BOL times are ${dur(gap)} apart. Your company may go by the BOL; fix a time if location was off.`}
          {orig ? ' You fixed a time; the original location record is kept.' : ''}
        </T>
      </Card>
      <Gap h={12} />
      <Card>
        <Row base>
          <T v="bodySmall" c={color.ink}>Total wait</T>
          <T v="numberS">{dur(c.wait)}</T>
        </Row>
      </Card>
      <Gap h={12} />
      <Card tone="signal">
        <T v="bodyTiny" c={color.onSignal}>Detention expected</T>
        <Gap h={4} />
        <T v="numberL" c={color.onSignal}>{money(c.owed)}</T>
        <Gap h={8} />
        <T v="bodySmall" c={color.onSignal}>
          {dur(c.paidMin)} past free time at {money(s.rules.rate)} an hour
          {c.minus ? `, after ${dur(c.minus)} break subtracted` : ''}
        </T>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thead: { flexDirection: 'row', paddingVertical: 6 },
  th: { ...type.bodyTiny, fontFamily: fontFamily.medium, color: color.sub, flex: 1, textAlign: 'right' },
  first: { textAlign: 'left' },
  tr: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: color.line, paddingVertical: 10 },
  cell: { flex: 1, alignItems: 'flex-end' },
  td: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 15, color: color.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  none: { fontFamily: fontFamily.regular, color: color.faint },
  struck: { fontFamily: fontFamily.regular, color: color.faint, textDecorationLine: 'line-through' },
});
