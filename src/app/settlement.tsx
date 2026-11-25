import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { Chip } from '../components/Chip';
import { SettlementScan } from '../components/SettlementScan';
import { Button, Card, Gap, Row, T } from '../components/ui';
import {
  checkEvents,
  followUpText,
  settlementDue,
  shortDate,
  totalEvents,
  type Claim,
  type ClaimEvent,
} from '../logic/claims';
import { money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { AmountField } from '../components/AmountField';
import { useStore } from '../state/AppStore';
import { useClaims } from '../state/useClaims';
import { useNow } from '../state/useNow';
import { color } from '../theme/tokens';

/** One checked settlement: what it showed for each claim, and the claims as they were before. */
interface Result {
  label: string;
  before: Claim[];
  evs: Record<string, Extract<ClaimEvent, { k: 'check' }>>;
  /** Claims with no load number, so a scan couldn't find them. */
  unmatched: string[];
  /** The detention total typed in, when that's all that was known. */
  total: number | null;
}

/**
 * Check a settlement: scan it, or type its detention total. The answer comes first (paid,
 * or how much short), each load says what happened to it, and anything not on it carries
 * over to the next settlement by itself.
 */
export default function Settlement() {
  const { a } = useStore();
  const { go } = useLocalSearchParams<{ go?: 'scan' | 'type' }>();
  const claims = useClaims();
  const [typing, setTyping] = useState(go === 'type');
  const [amt, setAmt] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const now = useNow();
  // Today asks once a settlement is due; opened from Claims, any open claim can be checked.
  const open = claims.filter((c) => c.stage !== 'paid' && !c.demo);
  const due = settlementDue(claims, now) ?? (open.length ? { label: shortDate(now), claims: open } : null);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/today'));

  function record(r: Result) {
    a.addClaimEvents(r.evs);
    setResult(r);
  }

  // The scan screens (capture, reading, review), for the claims due when it started.
  const [scanFor, setScanFor] = useState<{ label: string; claims: Claim[] } | null>(() => (go === 'scan' && due ? due : null));
  const scan = () => due && setScanFor(due);
  function scanned(got: Record<string, number>, unmatched: string[]) {
    if (!scanFor) return;
    const at = Date.now();
    const matched = scanFor.claims.filter((c) => !unmatched.includes(c.id));
    record({ label: scanFor.label, before: scanFor.claims, evs: asChecks(checkEvents(matched, scanFor.label, at, got)), unmatched, total: null });
    setScanFor(null);
  }

  function checkTotal() {
    if (!due) return;
    const total = parseFloat(amt);
    if (!Number.isFinite(total)) return;
    const at = Date.now();
    record({ label: due.label, before: due.claims, evs: asChecks(totalEvents(due.claims, due.label, at, total)), unmatched: [], total });
  }


  if (result) return <Answer r={result} claims={claims} onDone={() => router.navigate('/paycheck')} />;
  if (scanFor) {
    return (
      <SettlementScan
        label={scanFor.label}
        claims={scanFor.claims}
        onCancel={() => setScanFor(null)}
        onConfirm={scanned}
      />
    );
  }

  if (!due) {
    return (
      <Screen header={<BackBar label="Back" onPress={back} />}>
        <T v="h2">Nothing to check</T>
        <Gap h={8} />
        <T v="bodySmall">Every claim is paid or was checked on a recent settlement.</T>
      </Screen>
    );
  }

  const owed = due.claims.reduce((t, c) => t + c.left, 0);
  return (
    <Screen header={<BackBar label="Back" onPress={back} />}>
      <Row base>
        <T v="h2" style={styles.flex}>Check your settlement</T>
      </Row>
      <Gap h={8} />
      <T v="bodySmall">
        Looking for {money(owed)} of detention on {due.claims.length} load{due.claims.length > 1 ? 's' : ''}.
      </T>
      <Gap h={16} />
      <Card>
        {due.claims.map((c, i) => (
          <View key={c.id}>
            {i ? <View style={styles.rule} /> : null}
            <Row base style={styles.loadRow}>
              <View style={styles.flex}>
                <T v="bodyStrong">{c.load.name}</T>
                <T v="bodyTiny">{loadNo(c.load) ? `Load ${loadNo(c.load)}, ` : ''}{c.load.day}</T>
              </View>
              <T v="bodyStrong">{money(c.left)}</T>
            </Row>
          </View>
        ))}
      </Card>
      <Gap h={24} />
      <Button label="Scan the settlement" onPress={scan} />
      <Gap h={8} />
      <T v="bodyTiny" style={styles.center}>Claude finds each load on it by its number.</T>
      <Gap h={16} />
      {typing ? (
        <Card>
          <T v="bodyStrong">Detention total on the settlement</T>
          <Gap h={4} />
          <T v="bodySmall">If it lists detention as one line, type that line.</T>
          <Gap h={12} />
          <AmountField value={amt} onChange={setAmt} label="Detention total on the settlement" onSubmit={checkTotal} />
          <Gap h={12} />
          <Button label="Check it" variant="white" disabled={!Number.isFinite(parseFloat(amt))} onPress={checkTotal} />
        </Card>
      ) : (
        // On the page itself, the secondary button is the glass one.
        <Button label="Type the detention total" variant="quiet" onPress={() => setTyping(true)} />
      )}
    </Screen>
  );
}

const asChecks = (evs: Record<string, ClaimEvent>) => evs as Record<string, Extract<ClaimEvent, { k: 'check' }>>;

/** The answer: paid, or how much short, then each load, then what to do about it. */
function Answer({ r, claims, onDone }: { r: Result; claims: Claim[]; onDone: () => void }) {
  const { s, a } = useStore();
  const rows = r.before.map((c) => ({ c, e: r.evs[c.id] }));
  const got = rows.reduce((t, x) => t + (x.e && !x.e.whole ? x.e.got : 0), 0);
  const want = r.before.reduce((t, c) => t + c.left, 0);
  const short = Math.max(0, Math.round((want - (r.total ?? got)) * 100) / 100);
  const shortIds = rows.filter((x) => x.e && (x.e.whole || x.e.got < x.c.left - 0.005)).map((x) => x.c.id);
  const partly = rows.filter((x) => x.e && !x.e.whole && x.e.got > 0 && x.e.got < x.c.left - 0.005).length;
  // Already asked and still short: the next step is payroll, in writing. Otherwise, ask.
  const now = claims.filter((c) => shortIds.includes(c.id));
  const toPayroll = now.filter((c) => c.stage === 'askedShort');
  const toAsk = now.filter((c) => c.stage === 'short');
  // From a typed total, what's missing is the shortfall, not the claims' full amounts.
  const sum = (cs: Claim[]) => money(r.total != null ? short : cs.reduce((t, c) => t + c.left, 0));
  const ask = () => a.openClaimMessage(toAsk.map((c) => c.id), 'asked', followUpText(toAsk, s.rules, 'asked'));
  const payroll = () => a.openClaimMessage(toPayroll.map((c) => c.id), 'payroll', followUpText(toPayroll, s.rules, 'payroll'));
  const carried = r.before.some((c) => c.missed > 0);
  const owedWord = carried ? 'still owed' : 'you claimed';

  return (
    <Screen header={<BackBar label="Claims" onPress={onDone} />}>
      <T v="bodySmall">{r.label} settlement</T>
      <Gap h={8} />
      <Card flagged={short > 0} tone={short > 0 ? 'raise' : 'signal'}>
        <T v="bodyTiny" c={short > 0 ? color.sub : color.onSignal}>Detention on this settlement</T>
        <Gap h={4} />
        <T v="numberL" c={short > 0 ? color.ink : color.onSignal}>{money(r.total ?? got)}</T>
        <Gap h={8} />
        <T v="labelSmall" c={short > 0 ? color.flag : color.onSignal}>
          {short <= 0
            ? `All ${money(want)} ${owedWord} is paid`
            : short >= want - 0.005
              ? `None of the ${money(want)} ${owedWord} is on it`
              : `${money(short)} short of the ${money(want)} ${owedWord}`}
        </T>
      </Card>
      <Gap h={12} />
      <Card>
        {rows.map(({ c, e }, i) => (
          <View key={c.id}>
            {i ? <View style={styles.rule} /> : null}
            <View style={styles.loadRow}>
              <T v="bodyStrong">{c.load.name}</T>
              <Outcome c={c} e={e} unmatched={r.unmatched.includes(c.id)} />
              {e && !e.whole && e.got === 0 ? (
                <T v="bodyTiny">
                  {c.missed > 0
                    ? `Now missing from ${c.missed + 1} settlements. It stays open.`
                    : 'Often just a settlement late. It carries over to the next check.'}
                </T>
              ) : null}
              {r.unmatched.includes(c.id) ? <T v="bodyTiny">No load number, so the scan couldn’t find it. It stays open.</T> : null}
            </View>
          </View>
        ))}
        {r.total != null && short > 0 && r.before.length > 1 ? (
          <>
            <View style={styles.rule} />
            <T v="bodyTiny" style={styles.note}>The total doesn’t say which loads were left out, so all of them stay open.</T>
          </>
        ) : null}
      </Card>
      <Gap h={24} />
      {short > 0 && now.length ? (
        <>
          {toPayroll.length ? (
            <>
              <Button label={`Write to payroll about ${sum(toPayroll)}`} onPress={payroll} />
              <Gap h={8} />
              <T v="bodyTiny" style={styles.center}>
                {toPayroll.length > 1 ? 'You asked about these and they’re' : `You asked about ${toPayroll[0].load.name} and it’s`} still not paid. In writing, it’s on the record with a date.
              </T>
              <Gap h={16} />
            </>
          ) : null}
          {toAsk.length ? (
            <>
              <Button label={`Ask your fleet manager about ${sum(toAsk)}`} variant={toPayroll.length ? 'white' : 'primary'} onPress={ask} />
              <Gap h={8} />
              <T v="bodyTiny" style={styles.center}>
                {partly ? 'Paying less than you claimed is worth asking about now.' : 'You can also wait a week. Anything not on it is checked again next settlement.'}
              </T>
              <Gap h={16} />
            </>
          ) : null}
          <Button label="Done" variant="text" onPress={onDone} />
        </>
      ) : (
        <Button label="Done" onPress={onDone} />
      )}
    </Screen>
  );
}

function Outcome({ c, e, unmatched }: { c: Claim; e?: Extract<ClaimEvent, { k: 'check' }>; unmatched: boolean }) {
  if (unmatched || !e) return <Chip text="Not found" />;
  if (e.whole) return <Chip text="Not confirmed" />;
  if (e.got >= c.left - 0.005) return <Chip text={`Paid ${money(e.got)}`} tone="lime" />;
  if (e.got > 0) return <Chip text={`Paid ${money(e.got)} of ${money(c.left)}`} tone="flag" />;
  return <Chip text="Not on it" tone="flag" />;
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  loadRow: { paddingVertical: 12, gap: 4 },
  note: { paddingTop: 12 },
});
