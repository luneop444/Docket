import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { Button, Card, Fake, Gap, press, Row, T } from '../../components/ui';
import { isOpen, settlementDue, stageWords, type Claim } from '../../logic/claims';
import { rulesLine } from '../../logic/detention';
import { money } from '../../logic/format';
import { loadNo } from '../../logic/sampleData';
import { useStore } from '../../state/AppStore';
import { useClaims } from '../../state/useClaims';
import { useNow } from '../../state/useNow';
import { color } from '../../theme/tokens';
import { Tappable } from '../../components/Tappable';

/**
 * Claims: every load you're owed detention for, and where each one stands, from the claim
 * sent at the dock until it's paid. The weekly settlement check lives on Today; this is
 * what's still owed and the next step for each.
 */
export default function Claims() {
  const { s } = useStore();
  const claims = useClaims();
  const now = useNow();
  const open = claims.filter(isOpen);
  const paid = claims.filter((c) => !isOpen(c));
  const owed = open.reduce((t, c) => t + c.left, 0);
  const oldest = open.length ? Math.max(...open.map((c) => Math.floor((now - c.day) / 864e5))) : 0;
  const due = settlementDue(claims, now);
  const sample = claims[0]?.sample;

  return (
    <Screen tabs header={<PageHead title="Claims" right={open.length ? `${open.length} open` : undefined} />}>
      <Card>
        <T v="bodyTiny">Still owed to you</T>
        <Gap h={8} />
        <T v="numberL">{money(owed)}</T>
        <Gap h={8} />
        <T v="bodySmall">
          {open.length
            ? `Across ${open.length} claim${open.length > 1 ? 's' : ''}${!sample && oldest > 1 ? `, oldest ${oldest} days` : ''}.`
            : claims.length
              ? 'Every claim is paid.'
              : 'Nothing yet. A stop past free time becomes a claim here.'}
          {sample ? <Fake label="Sample data" /> : null}
        </T>
        <Gap h={12} />
        <View style={styles.rules}>
          <T v="bodyTiny" style={styles.flex}>Figured with {rulesLine(s.rules)}.</T>
          <Tappable accessibilityRole="button" accessibilityLabel="Change rules" onPress={() => router.push('/rules')} hitSlop={10} give={1} style={press.hit}>
            <T v="bodyTiny" c={color.ink} style={styles.link}>Change</T>
          </Tappable>
        </View>
        {due ? (
          <>
            <Gap h={16} />
            <Button label="Check a settlement" variant="white" onPress={() => router.push('/settlement')} />
          </>
        ) : null}
      </Card>
      {open.length ? (
        <>
          <Gap h={24} />
          <T v="labelSmall">Open</T>
          <Gap h={8} />
          <View style={styles.list}>
            {open.map((c) => <ClaimRow key={c.id} c={c} />)}
          </View>
        </>
      ) : null}
      {paid.length ? (
        <>
          <Gap h={24} />
          <T v="labelSmall">Paid</T>
          <Gap h={8} />
          <View style={styles.list}>
            {paid.map((c) => <ClaimRow key={c.id} c={c} />)}
          </View>
        </>
      ) : null}
      {s.history.length ? (
        <>
          <Gap h={16} />
          <Button label="All your stops · copy or export" variant="text" onPress={() => router.push('/history')} />
        </>
      ) : null}
    </Screen>
  );
}

function ClaimRow({ c }: { c: Claim }) {
  const w = stageWords(c);
  const no = loadNo(c.load);
  return (
    <Card flagged={w.tone === 'flag'} onPress={() => router.push(`/claim?id=${encodeURIComponent(c.id)}`)}>
      <Row base>
        <T v="bodyStrong" style={styles.flex}>{c.load.name}</T>
        <T v="numberS">{money(c.stage === 'paid' ? c.owed : c.left)}</T>
      </Row>
      <T v="bodyTiny">
        {no ? `Load ${no} · ` : ''}
        {c.load.day}
      </T>
      <Gap h={10} />
      <Row style={styles.status}>
        <Chip text={w.chip} tone={w.tone} />
        <T v="bodyTiny" style={styles.flex} numberOfLines={1}>{w.note}</T>
        <ChevronRight />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: 12 },
  rules: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  link: { textDecorationLine: 'underline' },
  status: { alignItems: 'center', gap: 10 },
});
