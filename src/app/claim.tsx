import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip } from '../components/Chip';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Card, Fake, Gap, press, Row, T } from '../components/ui';
import { followUpText, shortDate, stageWords, type Claim, type ClaimEvent } from '../logic/claims';
import { dur, money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { useClaims } from '../state/useClaims';
import { useNow } from '../state/useNow';
import { color } from '../theme/tokens';

/**
 * One claim, start to finish: every step with its date, then the next one. After a claim
 * goes unpaid: ask the fleet manager, then put it to payroll in writing. For company
 * drivers detention is company policy, not law, so the lever is a clean, dated record.
 */
export default function ClaimDetail() {
  const { s, a } = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const c = useClaims().find((x) => x.id === id);
  const [removing, setRemoving] = useState(false);
  const now = useNow();
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/paycheck'));

  if (!c) {
    return (
      <Screen header={<BackBar label="Claims" onPress={back} />}>
        <T v="h2">No claim here</T>
        <Gap h={8} />
        <T v="bodySmall">It was removed, or the stop isn’t owed detention.</T>
      </Screen>
    );
  }

  const w = stageWords(c);
  const no = loadNo(c.load);
  const next = nextStep(c);
  const act = () => {
    if (next.k === 'sent') router.push(`/claim-sheet?id=${encodeURIComponent(c.id)}`);
    else if (next.k === 'check') router.push('/settlement');
    else if (next.k === 'asked' || next.k === 'payroll') a.openClaimMessage([c.id], next.k, followUpText([c], s.rules, next.k));
  };
  const markPaid = () => a.markClaimPaid(c.id);
  const days = Math.max(0, Math.floor((now - c.day) / 864e5));

  return (
    <Screen header={<BackBar label="Claims" onPress={back} />}>
      <T v="h2">{c.load.name}</T>
      <Gap h={16} />
      <Card flagged={w.tone === 'flag'} tone={c.stage === 'paid' ? 'signal' : 'raise'}>
        <Row base>
          <T v="bodyTiny" c={c.stage === 'paid' ? color.onSignal : color.sub} style={styles.flex}>
            {no ? `Load ${no} · ` : ''}
            {c.load.day}
          </T>
          {c.sample ? <Fake label="Sample data" /> : c.stage !== 'paid' && days > 1 ? <Chip text={`${days} days`} tone={w.tone === 'flag' ? 'flag' : 'plain'} /> : null}
        </Row>
        <Gap h={8} />
        <T v="numberL" c={c.stage === 'paid' ? color.onSignal : color.ink}>{money(c.stage === 'paid' ? c.owed : c.left)}</T>
        <Gap h={8} />
        <T v="bodySmall" c={c.stage === 'paid' ? color.onSignal : color.sub}>
          {c.stage === 'paid'
            ? `Paid in full. ${dur(c.c.paidMin)} past free time.`
            : c.paid > 0
              ? `Still owed, of ${money(c.owed)}. ${money(c.paid)} paid so far.`
              : `Owed for ${dur(c.c.paidMin)} past free time.`}
        </T>
      </Card>
      <Gap h={12} />
      <Card>
        {c.events.map((e, i) => (
          <Step key={i} title={eventTitle(e, c)} when={eventWhen(e)} tone={eventTone(e, c)} last={!next.title && i === c.events.length - 1} />
        ))}
        {next.title ? <Step title={`Next: ${next.title}`} when={next.why} tone="open" last /> : null}
      </Card>
      <Gap h={24} />
      {next.button ? (
        <>
          <Button label={next.button} onPress={act} />
          <Gap h={8} />
        </>
      ) : null}
      <Row style={styles.pair}>
        {c.stage !== 'paid' ? <Button label="Mark paid" variant="white" small style={styles.flex} onPress={markPaid} /> : null}
        <Button
          label="See claim sheet"
          variant="white"
          small
          style={styles.flex}
          onPress={() => router.push(`/claim-sheet?id=${encodeURIComponent(c.id)}`)}
        />
      </Row>
      {next.k === 'payroll' || c.stage === 'payroll' ? (
        <>
          <Gap h={16} />
          <T v="bodyTiny">
            For company drivers, detention is set by company policy, not by law. A dated, written record with the claim sheet is the strongest thing you have.
          </T>
        </>
      ) : null}
      {!c.sample && !c.demo ? (
        <>
          <Gap h={24} />
          {removing ? (
            <View style={styles.confirm}>
              <T v="bodyTiny" style={styles.flex}>Remove {c.load.name} from your stops?</T>
              <Pressable accessibilityRole="button" onPress={() => setRemoving(false)} hitSlop={10} style={({ pressed }) => [press.hit, pressed && press.link]}>
                <T v="labelSmall">Keep</T>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  a.removeLogged(c.id);
                  back();
                }}
                hitSlop={10}
                style={({ pressed }) => [press.hit, pressed && press.link]}
              >
                <T v="labelSmall" c={color.flag}>Remove</T>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setRemoving(true)} hitSlop={8} style={({ pressed }) => [press.hit, styles.remove, pressed && press.link]}>
              <T v="bodyTiny">Not a real stop? Remove it</T>
            </Pressable>
          )}
        </>
      ) : null}
    </Screen>
  );
}

/** What happens next, from where the claim is. */
function nextStep(c: Claim): { k?: 'sent' | 'check' | 'asked' | 'payroll'; title?: string; why?: string; button?: string } {
  switch (c.stage) {
    case 'unsent':
      return { k: 'sent', title: 'send the claim sheet to dispatch', why: 'Many companies set a 24 to 48 hour deadline.', button: 'Send claim sheet' };
    case 'waiting':
      return { k: 'check', title: 'check it on your next settlement', why: 'Docket asks on Today when it’s due.', button: undefined };
    case 'short':
      return c.paid > 0
        ? { k: 'asked', title: 'ask your fleet manager', why: 'It was paid less than you claimed.', button: 'Ask your fleet manager' }
        : { k: 'asked', title: 'ask your fleet manager, or wait a week', why: 'Detention is often a settlement late. It’s checked again next time.', button: 'Ask your fleet manager' };
    case 'asked':
      return { k: 'check', title: 'see if the next settlement pays it', why: 'Docket checks it again on Today.', button: undefined };
    case 'askedShort':
      return { k: 'payroll', title: 'put it to payroll in writing', why: 'Same claim sheet, with each settlement it was missing from.', button: 'Write to payroll' };
    case 'payroll':
      return { k: 'check', title: 'keep checking settlements', why: 'Your written record is saved with its date.', button: undefined };
    case 'paid':
      return {};
  }
}

function eventTitle(e: ClaimEvent, c: Claim): string {
  switch (e.k) {
    case 'sent':
      return 'Claim sent to dispatch';
    case 'check':
      if (e.whole) return `${e.label} settlement came up short overall`;
      if (e.got <= 0) return `Not on the ${e.label} settlement`;
      return e.got >= c.owed - 0.005 ? `Paid on the ${e.label} settlement` : `${e.label} settlement paid ${money(e.got)}`;
    case 'asked':
      return 'You asked your fleet manager';
    case 'payroll':
      return 'You wrote to payroll';
    case 'paid':
      return 'You marked it paid';
  }
}

const eventWhen = (e: ClaimEvent) => (e.k === 'check' ? `Checked ${shortDate(e.at)}` : shortDate(e.at));

function eventTone(e: ClaimEvent, c: Claim): 'done' | 'flag' | 'lime' {
  if (e.k === 'paid') return 'lime';
  if (e.k === 'check') return !e.whole && e.got >= c.owed - 0.005 ? 'lime' : 'flag';
  return 'done';
}

function Step({ title, when, tone, last }: { title: string; when?: string; tone: 'done' | 'flag' | 'lime' | 'open'; last?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View style={[styles.node, tone === 'flag' && styles.nodeFlag, tone === 'lime' && styles.nodeLime, tone === 'open' && styles.nodeOpen]} />
        {last ? null : <View style={styles.stem} />}
      </View>
      <View style={[styles.flex, !last && styles.stepGap]}>
        <T v="bodyStrong">{title}</T>
        {when ? <T v="bodyTiny">{when}</T> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pair: { gap: 8 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  remove: { alignSelf: 'flex-start' },
  step: { flexDirection: 'row', gap: 12 },
  stepGap: { paddingBottom: 18 },
  rail: { width: 14, alignItems: 'center' },
  node: { width: 12, height: 12, borderRadius: 6, marginTop: 5, backgroundColor: color.ink },
  nodeFlag: { backgroundColor: color.flag },
  nodeLime: { backgroundColor: color.signal, borderWidth: 1.5, borderColor: color.ink },
  nodeOpen: { backgroundColor: 'transparent', borderWidth: 2, borderColor: color.ink },
  stem: { flex: 1, width: 2, marginTop: 4, backgroundColor: color.line },
});
