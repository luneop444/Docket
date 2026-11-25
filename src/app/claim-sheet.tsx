import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Card, Gap, Row, T } from '../components/ui';
import { claimSheetText, shortDate } from '../logic/claims';
import { clock, dur, money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { rulesLine } from '../logic/detention';
import { useStore } from '../state/AppStore';
import { currentClaimId } from '../state/currentClaim';
import { useClaims } from '../state/useClaims';
import { color } from '../theme/tokens';

/**
 * The claim sheet: the proof for one load, sent to dispatch from the dock. Many companies
 * want a detention claim within a day or two, so this is made the moment the stop ends,
 * and the same sheet backs every follow-up after.
 */
export default function ClaimSheet() {
  const { s, a, ui } = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const claims = useClaims();
  const c = claims.find((x) => x.id === id);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/paycheck'));

  if (!c) {
    return (
      <Screen header={<BackBar label="Back" onPress={back} />}>
        <T v="h2">No claim here</T>
        <Gap h={8} />
        <T v="bodySmall">This stop isn’t owed detention, or it was removed.</T>
      </Screen>
    );
  }

  const l = c.load;
  const no = loadNo(l);
  const isCurrent = id === currentClaimId(s);
  const hist = s.history.find((h) => h.id === c.id);
  const bol = isCurrent ? s.stop.bol : !!hist?.bol;
  const photo = isCurrent ? ui.photoUri : null;
  const sent = c.events.filter((e) => e.k === 'sent').at(-1);
  const send = () => a.openClaimMessage([c.id], 'sent', claimSheetText(c, s.rules, bol));

  return (
    <Screen
      header={<BackBar label="Back" onPress={back} />}
      footer={<Button label={sent ? 'Send it again' : 'Send to dispatch'} onPress={send} />}
    >
      <Row base>
        <T v="h2" style={styles.flex}>Claim sheet</T>
      </Row>
      <Gap h={4} />
      <T v="bodySmall">
        {sent
          ? `Sent ${shortDate(sent.at)}. It stays in Claims until it’s paid.`
          : 'Send it today. Many companies set a 24 to 48 hour deadline for detention claims.'}
      </T>
      <Gap h={16} />
      <Card style={styles.sheet}>
        <Row base>
          <T v="bodyStrong" style={styles.flex}>Detention claim</T>
          {no ? <T v="bodyTiny">Load {no}</T> : null}
        </Row>
        <View style={styles.rule} />
        <Line k="Facility" v={l.name} />
        <Line k="Day" v={l.day} />
        <Line k="Arrived" v={`${clock(l.arrive)}, from location`} />
        <Line k="Left" v={`${clock(l.leave)}, from location`} />
        {c.c.minus ? <Line k="Break" v={`${dur(c.c.minus)}, not counted`} /> : null}
        <Line k="Policy" v={rulesLine(s.rules)} />
        <View style={styles.rule} />
        <Row base>
          <T v="bodySmall" style={styles.flex}>
            {dur(c.c.paidMin)} past free time at {money(s.rules.rate)} an hour
          </T>
          <T v="numberS">{money(c.owed)}</T>
        </Row>
        <View style={styles.rule} />
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} accessibilityLabel="Your BOL photo" />
        ) : (
          <View style={styles.noPhoto}>
            <T v="bodyTiny">{bol ? 'Signed BOL photo on file' : 'No BOL photo. Snap the BOL to add the signed times.'}</T>
          </View>
        )}
        <Gap h={8} />
        <T v="bodyTiny">Times recorded by the driver’s phone at the facility.</T>
      </Card>
      <Gap h={12} />
      <T v="bodyTiny">
        It opens your own messaging app, so it goes out from you. Text, email or your company’s app all work.
      </T>
    </Screen>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.line}>
      <T v="bodySmall" style={styles.key}>{k}</T>
      <T v="bodySmall" c={color.ink} style={styles.flex}>{v}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { backgroundColor: color.bg, gap: 10 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  line: { flexDirection: 'row', gap: 12 },
  key: { width: 76 },
  photo: { height: 160, borderRadius: 14, backgroundColor: color.raise2 },
  noPhoto: { height: 64, borderRadius: 14, backgroundColor: color.raise2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
