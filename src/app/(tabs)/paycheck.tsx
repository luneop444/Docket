import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronLeft, ChevronRight, DocIcon } from '../../components/Icons';
import { Button, Card, Fake, Gap, noFocusRing, press, Row, Seg, T, TimeBar } from '../../components/ui';
import { calc, rulesLine } from '../../logic/detention';
import { marksFromSettlement, type SettlementReading } from '../../logic/documents';
import { clock, dur, money } from '../../logic/format';
import { payWeeks, type PayWeek } from '../../logic/history';
import { loadNo, type WeekLoad } from '../../logic/sampleData';
import { isFlagged, weekTotals } from '../../logic/settlement';
import type { AnonAnswer } from '../../logic/state';
import { useStore } from '../../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, pickScreenshot, postDoc, type DocFile } from '../../state/readDoc';
import { color, fontFamily, radius } from '../../theme/tokens';

/** v1 14–17: Paycheck check */
export default function Paycheck() {
  const { s, a } = useStore();
  const weeks = payWeeks(s.history);
  const [pick, setPick] = useState(0);
  const i = Math.min(pick, weeks.length - 1);
  const week = weeks[i];
  const w = weekTotals(week.loads, s.rules, s.marks);
  const loads = week.loads.map((l) => ({ l, c: calc(l.arrive, l.appt, l.leave, l.brk, s.rules) }));
  const owedLoads = loads.filter((x) => x.c.owed > 0);
  const inFree = loads.filter((x) => x.c.owed <= 0);
  const [reading, setReading] = useState(false);

  /** Claude reads the settlement; loads are matched by load number and marked. */
  async function scan() {
    let file: DocFile | null;
    try {
      file = await (Platform.OS === 'web' ? pickFile() : pickScreenshot());
    } catch (e) {
      a.toast(e instanceof DocReadError ? e.message : 'Couldn’t open that file.');
      return;
    }
    if (!file) return;
    setReading(true);
    try {
      const r = await postDoc<SettlementReading>('read-settlement', file, 'settlement');
      if (!r.found) {
        a.toast(r.note || 'No loads found on that page. Mark them below.');
        return;
      }
      const got = marksFromSettlement(week.loads, s.rules, r);
      a.applySettlement(got.marks);
      a.toast(
        !got.matched
          ? 'None of these loads are on that settlement. Check the load numbers, or mark them below.'
          : got.missing.length
            ? `Marked ${got.matched} of ${got.matched + got.missing.length}. Mark the rest below.`
            : `Marked all ${got.matched} from your settlement. Check each one.`,
      );
    } catch (e) {
      a.toast(e instanceof DocReadingOff || e instanceof DocReadError ? e.message : 'Couldn’t read the settlement. Try again.');
    } finally {
      setReading(false);
    }
  }

  return (
    <Screen tabs header={<PageHead title="Paycheck check" right={weeks.length > 1 ? undefined : week.label} />}>
      {weeks.length > 1 ? (
        <>
          <View style={styles.weekNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Newer week"
              disabled={i === 0}
              onPress={() => setPick(i - 1)}
              style={({ pressed }) => [styles.weekBtn, i === 0 && styles.off, pressed && styles.weekPressed]}
            >
              <ChevronLeft size={20} />
            </Pressable>
            <T v="bodyStrong">{week.label}</T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Older week"
              disabled={i === weeks.length - 1}
              onPress={() => setPick(i + 1)}
              style={({ pressed }) => [styles.weekBtn, i === weeks.length - 1 && styles.off, pressed && styles.weekPressed]}
            >
              <ChevronRight size={20} c={color.ink} />
            </Pressable>
          </View>
          <Gap h={12} />
        </>
      ) : null}
      <Card>
        <T v="bodyTiny">Detention Docket expects on this settlement</T>
        <Gap h={8} />
        <T v="numberL">{money(w.expected)}</T>
        <Gap h={8} />
        <T v="bodySmall">
          {w.eligible} load{w.eligible === 1 ? '' : 's'}, {rulesLine(s.rules)}.
        </T>
        <Gap h={12} />
        <T v="bodyTiny">
          {week.sample ? (
            <>
              <Fake label="Sample data" /> A made-up week. Stops you time with “I’m here” show here instead. Scan fills in a
              sample settlement.
            </>
          ) : (
            'From the stops you timed. Scan your settlement and Claude marks each load by its number, or mark them below.'
          )}
        </T>
        <Gap h={20} />
        <Row style={{ gap: 12 }}>
          <Button label="Change rules" variant="white" small style={styles.flex} onPress={() => router.push('/rules')} />
          {w.eligible ? (
            <Button
              label={reading ? 'Reading…' : 'Scan'}
              variant="white"
              small
              style={styles.flex}
              icon={<DocIcon />}
              disabled={reading}
              onPress={week.sample ? a.scanSample : scan}
            />
          ) : null}
        </Row>
      </Card>
      <Gap h={32} />
      <T v="bodySmall">
        {loads.length ? 'Find each load on your settlement and mark what you see.' : 'No stops this week.'}
      </T>
      <Gap h={12} />
      <View style={{ gap: 12 }}>
        {owedLoads.map(({ l, c }) => (
          <LoadCard
            key={l.id}
            l={l}
            owed={c.owed}
            freeEnd={c.freeEnd}
            paidMin={c.paidMin}
            onRemove={week.sample ? undefined : () => a.removeLogged(l.id)}
          />
        ))}
        {inFree.length ? (
          <Card>
            <T v="bodySmall">
              {inFree.length} {owedLoads.length ? 'other ' : ''}load{inFree.length > 1 ? 's' : ''} stayed within free time:{' '}
              {inFree.map((x) => x.l.name).join(', ').replace(/\.$/, '')}.
            </T>
          </Card>
        ) : null}
        <Summary week={week} />
        {s.history.length ? (
          <Button label="All your stops · copy or export" variant="text" onPress={() => router.push('/history')} />
        ) : null}
      </View>
    </Screen>
  );
}

function LoadCard({
  l,
  owed,
  freeEnd,
  paidMin,
  onRemove,
}: {
  l: WeekLoad;
  owed: number;
  freeEnd: number;
  paidMin: number;
  onRemove?: () => void;
}) {
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
        {loadNo(l) ? `Load ${loadNo(l)}, ` : ''}
        {l.day}, {clock(l.arrive)} to {clock(l.leave)}
      </T>
      <Gap h={16} />
      <TimeBar free={Math.min(free, total)} detention={Math.max(0, total - free)} />
      <Gap h={8} />
      <T v="bodyTiny">{dur(paidMin)} past free time</T>
      <Gap h={16} />
      <Seg
        label={`What your settlement shows for ${l.name}${loadNo(l) ? `, load ${loadNo(l)}` : ''}`}
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
            placeholderTextColor={color.sub}
            inputMode="decimal"
            keyboardType="decimal-pad"
            style={styles.amountInput}
            accessibilityLabel={`Amount on settlement for load ${l.id}`}
          />
        </View>
      ) : null}
      {onRemove ? (
        <Pressable accessibilityRole="button" onPress={onRemove} style={({ pressed }) => [styles.remove, pressed && press.link]} hitSlop={8}>
          <T v="bodyTiny">Not a real stop? Remove it</T>
        </Pressable>
      ) : null}
    </Card>
  );
}

function Summary({ week }: { week: PayWeek }) {
  const { s, a } = useStore();
  const w = weekTotals(week.loads, s.rules, s.marks);

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
            One tap, shared anonymously under {s.company || 'your company'}. No pay documents are shared.
          </T>
          <Gap h={12} />
          <Seg<AnonAnswer>
            label="Was your detention paid this week?"
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
        <Button label="Ask my fleet manager" onPress={() => a.openMessage(week)} />
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
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekPressed: { backgroundColor: color.line },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.chip, borderCurve: 'continuous',
    backgroundColor: color.raise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  remove: { marginTop: 12, alignSelf: 'flex-start' },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14, borderCurve: 'continuous',
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
