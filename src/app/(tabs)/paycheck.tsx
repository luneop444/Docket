import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PageHead, Screen } from '../../components/Chrome';
import { DocIcon } from '../../components/Icons';
import { Button, Card, Fake, Gap, noFocusRing, Row, Seg, T, TimeBar } from '../../components/ui';
import { calc, rulesLine } from '../../logic/detention';
import { clock, dur, money } from '../../logic/format';
import { WEEK, WEEK_LABEL, type WeekLoad } from '../../logic/sampleData';
import { isFlagged, weekTotals } from '../../logic/settlement';
import type { AnonAnswer } from '../../logic/state';
import { useStore } from '../../state/AppStore';
import { color, fontFamily } from '../../theme/tokens';

/** v1 14–17: Paycheck check */
export default function Paycheck() {
  const { s, a } = useStore();
  const w = weekTotals(WEEK, s.rules, s.marks);
  const loads = WEEK.map((l) => ({ l, c: calc(l.arrive, l.appt, l.leave, l.brk, s.rules) }));
  const owedLoads = loads.filter((x) => x.c.owed > 0);
  const inFree = loads.filter((x) => x.c.owed <= 0);

  return (
    <Screen header={<PageHead title="Paycheck check" right={WEEK_LABEL} />}>
      <Card>
        <T v="bodyTiny">Detention Docket expects on this settlement</T>
        <Gap h={8} />
        <T v="numberL">{money(w.expected)}</T>
        <Gap h={8} />
        <T v="bodySmall">
          {w.eligible} loads, {rulesLine(s.rules)}.
        </T>
        <Gap h={12} />
        <Row style={{ gap: 12 }}>
          <Button label="Change rules" variant="white" small style={styles.flex} onPress={() => router.push('/rules')} />
          <Button label="Scan" variant="white" small style={styles.flex} icon={<DocIcon />} onPress={a.scanSample} />
        </Row>
        <Gap h={8} />
        <T v="bodyTiny">
          <Fake /> Scan fills in a sample settlement. Or mark each load yourself below.
        </T>
      </Card>
      <Gap h={16} />
      <T v="bodySmall" style={{ paddingLeft: 4 }}>Find each load on your settlement and mark what you see.</T>
      <Gap h={12} />
      <View style={{ gap: 12 }}>
        {owedLoads.map(({ l, c }) => (
          <LoadCard key={l.id} l={l} owed={c.owed} freeEnd={c.freeEnd} paidMin={c.paidMin} />
        ))}
        {inFree.length ? (
          <Card>
            <T v="bodySmall">
              {inFree.length} other load{inFree.length > 1 ? 's' : ''} stayed within free time:{' '}
              {inFree.map((x) => x.l.name).join(', ').replace(/\.$/, '')}.
            </T>
          </Card>
        ) : null}
        <Summary />
      </View>
    </Screen>
  );
}

function LoadCard({ l, owed, freeEnd, paidMin }: { l: WeekLoad; owed: number; freeEnd: number; paidMin: number }) {
  const { s, a } = useStore();
  const m = s.marks[l.id];
  const total = l.leave - l.arrive;
  const free = Math.max(0, freeEnd - l.arrive);
  return (
    <Card flagged={isFlagged(owed, m)}>
      <Row base>
        <T v="bodyStrong">{l.name}</T>
        <T v="numberS">{money(owed)}</T>
      </Row>
      <T v="bodyTiny">
        Load {l.id}, {l.day}, {clock(l.arrive)} to {clock(l.leave)}
      </T>
      <Gap h={12} />
      <TimeBar free={Math.min(free, total)} detention={Math.max(0, total - free)} />
      <Gap h={8} />
      <T v="bodyTiny">{dur(paidMin)} past free time</T>
      <Gap h={12} />
      <Seg
        options={[
          { key: 'paid' as const, label: 'Paid' },
          { key: 'less' as const, label: 'Less', flag: true },
          { key: 'none' as const, label: 'Not there', flag: true },
        ]}
        value={m?.m}
        onChange={(k) => a.mark(l.id, k)}
      />
      {m?.m === 'less' ? (
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>Settlement shows $</Text>
          <TextInput
            value={m.amt ?? ''}
            onChangeText={(v) => a.setAmt(l.id, v)}
            placeholder="0.00"
            placeholderTextColor={color.faint}
            inputMode="decimal"
            keyboardType="decimal-pad"
            style={styles.amountInput}
            accessibilityLabel={`Amount on settlement for load ${l.id}`}
          />
        </View>
      ) : null}
    </Card>
  );
}

function Summary() {
  const { s, a } = useStore();
  const w = weekTotals(WEEK, s.rules, s.marks);

  if (s.sent) {
    return (
      <>
        <Card>
          <T v="bodyStrong">Sent to your fleet manager</T>
          <Gap h={8} />
          <T v="bodySmall">Docket will remind you if next week’s settlement still leaves these out.</T>
        </Card>
        <Card>
          <T v="bodyStrong">Was your detention paid this week?</T>
          <Gap h={8} />
          <T v="bodySmall">
            One tap, shared anonymously under {s.company || 'your company'}. No pay documents leave your phone.
          </T>
          <Gap h={12} />
          <Seg<AnonAnswer>
            options={(['Paid', 'Partly', 'Not paid'] as const).map((x) => ({ key: x, label: x }))}
            value={s.anon}
            onChange={a.setAnon}
          />
          <Gap h={8} />
          <T v="bodyTiny">
            <Fake /> Saved on this phone only. Nothing is shared in the prototype.
          </T>
        </Card>
      </>
    );
  }
  if (w.flagged.length) {
    const n = w.flagged.length;
    return (
      <Card flagged>
        <Row base>
          <T v="bodyStrong">
            {n} load{n > 1 ? 's look' : ' looks'} short
          </T>
          <T v="numberS" c={color.flag}>{money(w.short)}</T>
        </Row>
        <Gap h={8} />
        <T v="bodySmall">Detention is sometimes paid a pay period late. You can wait a week, or ask now.</T>
        <Gap h={12} />
        <Button label="Ask my fleet manager" onPress={a.openMessage} />
      </Card>
    );
  }
  if (w.checked) {
    return (
      <Card tone="signal">
        <T v="bodyStrong" c={color.onSignal}>All detention looks paid</T>
        <Gap h={8} />
        <T v="bodySmall" c={color.onSignal}>Every load matched what your rules say you’re owed.</T>
      </Card>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: color.bg,
    marginTop: 10,
  },
  amountLabel: { fontFamily: fontFamily.regular, fontSize: 17, color: color.sub },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.regular,
    fontSize: 17,
    color: color.ink,
    ...noFocusRing,
  },
});
