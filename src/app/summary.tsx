import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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

/** Spoken form of a time cell: "1:48 PM", "2:05 PM, changed from 1:48 PM", or "none". */
function say(cur: number | null | undefined, orig?: number | null) {
  if (cur == null) return 'none';
  return orig != null && orig !== cur ? `${clock(cur)}, changed from ${clock(orig)}` : clock(cur);
}

/**
 * One row of the Location / BOL table. Read as a single sentence ("In: location
 * 1:48 PM, BOL none") so screen reader users don't hear loose cells with no
 * column headers.
 */
function TRow({ label, loc, bol, spoken }: { label: string; loc: ReactNode; bol: ReactNode; spoken: string }) {
  return (
    <View style={styles.tr} accessible role="group" accessibilityLabel={`${label}: ${spoken}`}>
      <Text style={[styles.td, styles.first]}>{label}</Text>
      <View style={styles.cell}>{loc}</View>
      <View style={styles.cell}>{bol}</View>
    </View>
  );
}

const None = ({ text = 'None' }: { text?: string }) => <Text style={[styles.td, styles.none]}>{text}</Text>;

/** v1 11 Stop summary (+ 12 Fix a time sheet) */
export default function StopSummary() {
  const { s, a, ui } = useStore();
  const st = s.stop;
  // Audit #4: BOL times are read by AI. The driver checks them against the paper before they count,
  // and they never replace location times (detention below is always figured from location).
  const [check, setCheck] = useState<'ask' | 'ok' | 'no'>('ask');
  const c = stopCalc(st, s.now, s.rules);
  const read = bolTimesOf(st);
  const aiRead = !!st.bol && read != null;
  const bol = aiRead && check !== 'no' ? read : null;
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
      {aiRead && check === 'ask' ? (
        <>
          <Card>
            <Row style={{ gap: 12, alignItems: 'flex-start' }}>
              {ui.photoUri ? (
                <Image source={{ uri: ui.photoUri }} style={styles.thumb} accessibilityLabel="Your BOL photo" />
              ) : null}
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">Check the BOL times</T>
                <Gap h={4} />
                <T v="bodySmall">
                  Read by AI from your photo. AI can misread handwriting, so compare them with the paper before you use
                  them.
                </T>
              </View>
            </Row>
            <Gap h={12} />
            <Row style={{ gap: 8 }}>
              <Button label="They match" small style={{ flex: 1 }} onPress={() => setCheck('ok')} />
              <Button label="They’re wrong" variant="white" small style={{ flex: 1 }} onPress={() => setCheck('no')} />
            </Row>
          </Card>
          <Gap h={12} />
        </>
      ) : null}
      <Card>
        <View style={styles.thead} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <Text style={[styles.th, styles.first]} />
          <Text style={styles.th}>Location</Text>
          <Text style={styles.th}>
            BOL{aiRead ? ' · AI' : ''} {read?.sample ? <Fake label="Sample" /> : null}
          </Text>
        </View>
        <TRow label="In" spoken={`location ${say(st.arrive, orig?.arrive)}, BOL ${bol && bol.in != null ? say(bol.in) : 'none'}`} loc={<TimeCell cur={st.arrive} orig={orig?.arrive} />} bol={bol && bol.in != null ? <TimeCell cur={bol.in} /> : <None />} />
        <TRow label="Checked in" spoken={`location ${say(st.checkin)}`} loc={<TimeCell cur={st.checkin} />} bol={<None text="—" />} />
        {st.brk ? <TRow label="Off-duty break" spoken={dur(st.brk)} loc={<Text style={styles.td}>{dur(st.brk)}</Text>} bol={<None text="—" />} /> : null}
        <TRow label="Out" spoken={`location ${say(st.leave, orig?.leave)}, BOL ${bol && bol.out != null ? say(bol.out) : 'none'}`} loc={<TimeCell cur={st.leave} orig={orig?.leave} />} bol={bol && bol.out != null ? <TimeCell cur={bol.out} /> : <None />} />
        <T v="bodyTiny" style={{ marginTop: 8 }}>
          {!st.bol
            ? 'Location times only. No BOL photo.'
            : check === 'no'
              ? 'BOL times not used. Detention is figured from your location times.'
              : aiRead && check === 'ask'
                ? 'BOL times not checked yet. Detention is figured from your location times either way.'
            : gap == null
              ? `No times read off the BOL.${st.bolTimes?.note ? ` ${st.bolTimes.note}` : ''}`
              : gap <= 15
                ? `Location and BOL times agree within ${Math.max(1, Math.round(gap))} minute${Math.round(gap) > 1 ? 's' : ''}.`
                : `Location and BOL times are ${dur(gap)} apart. Your company may go by the BOL; fix a time if location was off.`}
          {check === 'ok' ? ' You checked them against the paper.' : ''}
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
  none: { fontFamily: fontFamily.regular, color: color.sub },
  thumb: { width: 56, height: 72, borderRadius: 8, backgroundColor: color.raise2 },
  struck: { fontFamily: fontFamily.regular, color: color.sub, textDecorationLine: 'line-through' },
});
