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
import { color, fontFamily, glass, radius } from '../../theme/tokens';

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
  // The answer as you go: how many loads are checked, and what's short so far.
  const done = owedLoads.filter((x) => s.marks[x.l.id]).length;
  const started = done > 0;
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

  const onScan = week.sample ? a.scanSample : scan;

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
        {w.eligible ? (
          <>
            <Gap h={8} />
            <Progress done={done} of={w.eligible} short={w.short} />
          </>
        ) : null}
        <Gap h={8} />
        {/* The rules behind the figure, with the way to change them: setup, so a quiet link,
            not a button beside the main action. */}
        <View style={styles.rulesRow}>
          <T v="bodySmall" style={styles.flex}>
            {w.eligible} load{w.eligible === 1 ? '' : 's'}, {rulesLine(s.rules)}.
          </T>
          <Pressable accessibilityRole="button" accessibilityLabel="Change rules" onPress={() => router.push('/rules')} hitSlop={10} style={({ pressed }) => pressed && press.link}>
            <T v="bodySmall" style={styles.link}>Change</T>
          </Pressable>
        </View>
        <Gap h={12} />
        <T v="bodyTiny">
          {week.sample ? (
            <>
              <Fake label="Sample data" /> A made-up week, until you time your own stops.
            </>
          ) : (
            'From the stops you timed. Scan your settlement and Claude marks each load by its number, or mark them below.'
          )}
        </T>
        {w.eligible ? (
          <>
            <Gap h={20} />
            {/* The fastest way to check every load: the one main action here. */}
            <Button
              label={reading ? 'Reading…' : 'Scan your settlement'}
              icon={<DocIcon c={color.bg} />}
              disabled={reading}
              onPress={onScan}
            />
          </>
        ) : null}
      </Card>
      <Gap h={32} />
      {loads.length ? (
        <>
          <Row base>
            <T v="bodyStrong">Check each load</T>
            {w.eligible ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Scan your settlement" onPress={onScan} disabled={reading} hitSlop={10} style={({ pressed }) => pressed && press.link}>
                <T v="bodySmall" style={styles.link}>{reading ? 'Reading…' : 'Or scan it'}</T>
              </Pressable>
            ) : null}
          </Row>
          <Gap h={6} />
          {/* Which settlement: the stops are grouped by the week they happened, and detention for
              them is often paid on that week's settlement or the next one. */}
          <T v="bodySmall">
            Find each load on the settlement that pays the {week.label.replace(/^Week of/, 'week of')} stops. Detention can come a
            settlement late, so if a load isn’t on it, mark Not yet.
          </T>
        </>
      ) : (
        <T v="bodySmall">No stops this week.</T>
      )}
      <Gap h={12} />
      <View style={{ gap: 12 }}>
        {owedLoads.map(({ l, c }) => (
          <LoadCard
            key={l.id}
            l={l}
            owed={c.owed}
            freeEnd={c.freeEnd}
            paidMin={c.paidMin}
            pending={started && !s.marks[l.id]}
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
  pending,
  onRemove,
}: {
  l: WeekLoad;
  owed: number;
  freeEnd: number;
  paidMin: number;
  /** Others in the week are checked and this one isn't yet. */
  pending?: boolean;
  onRemove?: () => void;
}) {
  const { s, a } = useStore();
  const [confirming, setConfirming] = useState(false);
  const m = s.marks[l.id];
  const total = l.leave - l.arrive;
  const free = Math.max(0, freeEnd - l.arrive);
  return (
    <Card flagged={isFlagged(owed, m)}>
      <Row base>
        <T v="bodyStrong" style={styles.flex}>{l.name}</T>
        {/* Labelled: beside a settlement, a bare figure reads as what was paid. */}
        <T v="numberS">
          {money(owed)}
          <Text style={styles.owedWord}> owed</Text>
        </T>
      </Row>
      <T v="bodyTiny">
        {loadNo(l) ? `Load ${loadNo(l)}, ` : ''}
        {l.day}, {clock(l.arrive)} to {clock(l.leave)}
      </T>
      <Gap h={16} />
      <TimeBar free={Math.min(free, total)} detention={Math.max(0, total - free)} />
      <Gap h={8} />
      {/* The bar's key, in the bar's order and colours. */}
      <View style={styles.key}>
        {free > 0 ? (
          <View style={styles.keyItem}>
            <View style={[styles.swatch, { backgroundColor: color.free }]} />
            <T v="bodyTiny">{dur(Math.min(free, total))} free</T>
          </View>
        ) : null}
        <View style={styles.keyItem}>
          <View style={[styles.swatch, { backgroundColor: color.detention }]} />
          <T v="bodyTiny">{dur(paidMin)} past free time</T>
        </View>
      </View>
      <Gap h={16} />
      {pending ? (
        <>
          <T v="labelSmall">Not checked yet</T>
          <Gap h={8} />
        </>
      ) : null}
      <Seg
        label={`What your settlement shows for ${l.name}${loadNo(l) ? `, load ${loadNo(l)}` : ''}`}
        options={[
          { key: 'paid' as const, label: 'Paid' },
          { key: 'less' as const, label: 'Less', flag: true },
          // "Not yet", not "Not there": detention is often paid a settlement late.
          { key: 'none' as const, label: 'Not yet', flag: true },
        ]}
        value={m?.m}
        onChange={(k) => a.mark(l.id, k)}
      />
      {m?.m === 'less' ? (
        <>
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
        {notLess(m.amt, owed) ? (
          // "Less" with an amount that covers what's owed would quietly read as paid: say so.
          <View style={styles.notLess}>
            <T v="bodyTiny" style={styles.flex}>
              That’s the full {money(owed)} or more, so it isn’t short.
            </T>
            <Pressable accessibilityRole="button" onPress={() => a.mark(l.id, 'paid')} hitSlop={10} style={({ pressed }) => pressed && press.link}>
              <T v="labelSmall" style={styles.link}>Mark as paid</T>
            </Pressable>
          </View>
        ) : null}
        </>
      ) : null}
      {onRemove ? (
        confirming ? (
          // Removing can't be undone, and the link sits by the marking buttons: confirm first.
          <View style={styles.confirm}>
            <T v="bodyTiny" style={styles.flex}>Remove {l.name} from your stops?</T>
            <Pressable accessibilityRole="button" onPress={() => setConfirming(false)} hitSlop={10} style={({ pressed }) => pressed && press.link}>
              <T v="labelSmall">Keep</T>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={10} style={({ pressed }) => pressed && press.link}>
              <T v="labelSmall" c={color.flag}>Remove</T>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={({ pressed }) => [styles.remove, pressed && press.link]} hitSlop={8}>
            <T v="bodyTiny">Not a real stop? Remove it</T>
          </Pressable>
        )
      ) : null}
    </Card>
  );
}

/** The running answer under the expected total: checked so far, and what's short. */
function Progress({ done, of, short }: { done: number; of: number; short: number }) {
  const all = done === of;
  const what = short > 0 ? `${money(short)} short${all ? '' : ' so far'}` : all ? 'all paid' : 'nothing short so far';
  const line = done === 0 ? `None of ${of} checked yet` : `${all ? `All ${of}` : `${done} of ${of}`} checked · ${what}`;
  return (
    <T v="labelSmall" c={short > 0 ? color.flag : color.ink} accessibilityLiveRegion="polite">
      {line}
    </T>
  );
}

function Summary({ week }: { week: PayWeek }) {
  const { s, a } = useStore();
  const w = weekTotals(week.loads, s.rules, s.marks);

  if (s.sent[week.key]) {
    const out = s.anon[week.key];
    // How it turned out, asked once the next settlement can show it (not as the message
    // goes). The one answer is the outcome and the anonymous share, so nothing is asked twice.
    const company = s.company || 'your company';
    if (out === 'Paid') {
      return (
        <Card tone="signal">
          <T v="bodyStrong" c={color.onSignal}>Paid after you asked</T>
          <Gap h={8} />
          <T v="bodySmall" c={color.onSignal}>Added anonymously under {company}.</T>
        </Card>
      );
    }
    if (out) {
      return (
        <Card flagged>
          <Row base>
            <T v="bodyStrong">{out === 'Partly' ? 'Still partly short' : 'Still not paid'}</T>
            <T v="numberS" c={color.flag}>{money(w.short)}</T>
          </Row>
          <Gap h={8} />
          <T v="bodySmall">Added anonymously under {company}. You can ask again with the same details.</T>
          <Gap h={12} />
          <Button label="Ask again" onPress={() => a.openMessage(week)} />
        </Card>
      );
    }
    return (
      <Card>
        <T v="bodyStrong">Sent to your fleet manager</T>
        <Gap h={8} />
        <T v="bodySmall">Docket will remind you if next week’s settlement still leaves these out.</T>
        <Gap h={8} />
        <T v="bodyTiny">
          <Fake /> No reminder is set in the prototype.
        </T>
        <Gap h={16} />
        <T v="bodyStrong">When your next settlement comes, how did it go?</T>
        <Gap h={4} />
        <T v="bodyTiny">Your answer is shared anonymously under {company}. No pay documents are shared.</T>
        <Gap h={12} />
        <Seg<AnonAnswer>
          label="How did it go?"
          options={[
            { key: 'Paid', label: 'Paid now' },
            { key: 'Partly', label: 'Part of it' },
            { key: 'Not paid', label: 'Still not paid' },
          ]}
          value={undefined}
          onChange={(k) => a.setAnon(week.key, k)}
        />
        <Gap h={8} />
        <T v="bodyTiny">
          <Fake /> Saved on this phone only. Nothing is shared in the prototype.
        </T>
      </Card>
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
        <T v="bodySmall">
          {w.flagged.every((f) => f.got === 0)
            ? 'Detention is often paid a settlement late. You can check next week’s first, or ask now.'
            : w.flagged.some((f) => f.got === 0)
              ? 'Some were paid less, and some aren’t on it yet (detention can come a settlement late). You can wait a week, or ask now.'
              : 'Paid less than your company’s rules give. You can ask now.'}
        </T>
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

/** An amount typed for "Less" that isn't less than what's owed. */
function notLess(amt: string | undefined, owed: number) {
  const got = parseFloat(amt ?? '');
  return Number.isFinite(got) && got >= owed;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notLess: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  rulesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  owedWord: { fontFamily: fontFamily.regular, fontSize: 13, color: color.sub },
  key: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 6, borderRadius: 3 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  link: { textDecorationLine: 'underline' },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekPressed: { backgroundColor: color.line },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.chip, borderCurve: 'continuous',
    ...glass,
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
