import { Platform, StyleSheet, Text, View } from 'react-native';
import type { Claim } from '../logic/claims';
import { money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { color } from '../theme/tokens';

/**
 * A made-up settlement statement, drawn, for the sample week: what a driver would
 * photograph. No carrier's name or branding, and marked as a sample on the page.
 * Its detention lines are the ones the sample scan reads back.
 */
export function SampleSettlementPage({ label, claims, paid, highlight }: { label: string; claims: Claim[]; paid: Record<string, number>; highlight?: boolean }) {
  const rows: { load: string; what: string; amt: number }[] = [];
  claims.forEach((c, i) => {
    const no = loadNo(c.load) ?? '—';
    rows.push({ load: no, what: `Linehaul · ${c.load.name}`, amt: 612 + i * 87.5 });
    if ((paid[c.id] ?? 0) > 0) rows.push({ load: no, what: 'Detention', amt: paid[c.id] });
  });
  rows.push({ load: '', what: 'Fuel advance', amt: -150 });
  rows.push({ load: '', what: 'ELD fee', amt: -12 });
  const net = rows.reduce((t, r) => t + r.amt, 0);
  return (
    <View style={styles.page} accessibilityLabel={`Sample settlement statement, pay date ${label}`}>
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>DRIVER SETTLEMENT STATEMENT</Text>
          <Text style={styles.meta}>Pay date {label}    Driver no. 20417    Direct deposit</Text>
        </View>
        <Text style={styles.stamp}>SAMPLE</Text>
      </View>
      <View style={styles.rule} />
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cell, styles.colLoad, styles.colHead]}>LOAD</Text>
        <Text style={[styles.cell, styles.colWhat, styles.colHead]}>DESCRIPTION</Text>
        <Text style={[styles.cell, styles.colAmt, styles.colHead]}>AMOUNT</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, highlight && r.what === 'Detention' && styles.hit]}>
          <Text style={[styles.cell, styles.num, styles.colLoad]}>{r.load}</Text>
          <Text style={[styles.cell, styles.colWhat]} numberOfLines={1}>{r.what}</Text>
          <Text style={[styles.cell, styles.num, styles.colAmt]}>{r.amt < 0 ? `(${money(-r.amt)})` : money(r.amt)}</Text>
        </View>
      ))}
      <View style={styles.rule} />
      <View style={styles.row}>
        <Text style={[styles.cell, styles.colLoad]} />
        <Text style={[styles.cell, styles.colWhat, styles.th]}>Net pay</Text>
        <Text style={[styles.cell, styles.num, styles.colAmt, styles.th]}>{money(net)}</Text>
      </View>
      {/* What the rest of a real statement carries, down the page: miles and year to date. */}
      <View style={styles.rule} />
      <View style={styles.row}>
        <Text style={[styles.cell, styles.colLoad]} />
        <Text style={[styles.cell, styles.colWhat]}>Paid miles this period</Text>
        <Text style={[styles.cell, styles.num, styles.colAmt]}>{(1840 + claims.length * 212).toLocaleString('en-US')}</Text>
      </View>
      {/* The deductions block every statement carries, so the page reads full to the tear. */}
      <Text style={[styles.meta, styles.ytdHead]}>DEDUCTIONS THIS PERIOD</Text>
      {[
        ['Occupational accident', -38.5],
        ['Escrow', -50],
        ['Plate program', -22.75],
      ].map(([k, v]) => (
        <View key={k as string} style={styles.row}>
          <Text style={[styles.cell, styles.colLoad]} />
          <Text style={[styles.cell, styles.colWhat]}>{k}</Text>
          <Text style={[styles.cell, styles.num, styles.colAmt]}>{`(${money(-(v as number))})`}</Text>
        </View>
      ))}
      <View style={styles.fill} />
      <View style={styles.tear} />
      <Text style={[styles.meta, styles.ytdHead]}>YEAR TO DATE</Text>
      {[
        ['Gross', 41380.25],
        ['Net', 37468.25],
      ].map(([k, v]) => (
        <View key={k as string} style={styles.row}>
          <Text style={[styles.cell, styles.colLoad]} />
          <Text style={[styles.cell, styles.colWhat]}>{k}</Text>
          <Text style={[styles.cell, styles.num, styles.colAmt]}>{(v as number) < 0 ? `(${money(-(v as number))})` : money(v as number)}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Printed, not designed: a payroll system's statement comes off an office printer in the
 * printer's fonts, Helvetica for words and Courier for figures, in toner black, not in the
 * app's type. That's most of what makes it read as a real page in the photo.
 */
const SANS = Platform.select({ ios: 'Helvetica', web: 'Helvetica, Arial, sans-serif', default: 'sans-serif' });
const MONO = Platform.select({ ios: 'Courier', web: '"Courier New", Courier, monospace', default: 'monospace' });
const toner = 'rgba(18,18,18,0.86)';
const ink = toner;
const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 6 },
  tear: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(18,18,18,0.4)', marginBottom: 4 },
  ytdHead: { marginBottom: 1, fontFamily: SANS, fontWeight: '700', fontSize: 6.5, letterSpacing: 0.4, color: toner },
  page: { width: '100%', height: '100%', backgroundColor: '#F4F2EC', paddingHorizontal: 14, paddingVertical: 14, gap: 3.5 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: SANS, fontWeight: '700', fontSize: 9, letterSpacing: 0.3, color: toner },
  meta: { fontFamily: SANS, fontSize: 7, color: ink, marginTop: 2 },
  stamp: { fontFamily: SANS, fontWeight: '700', fontSize: 7.5, letterSpacing: 1, color: color.flag, borderWidth: 1, borderColor: color.flag, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, transform: [{ rotate: '-4deg' }], opacity: 0.85 },
  rule: { height: 0.75, backgroundColor: toner, opacity: 0.55, marginVertical: 3 },
  row: { flexDirection: 'row', paddingVertical: 1.5 },
  headRow: { paddingVertical: 2.5, backgroundColor: 'rgba(18,18,18,0.07)', borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: 'rgba(18,18,18,0.45)' },
  colHead: { fontFamily: SANS, fontWeight: '700', fontSize: 6.5, letterSpacing: 0.4, color: toner },
  // What was read, marked once it's found.
  hit: { backgroundColor: color.signal, borderRadius: 2 },
  cell: { fontFamily: SANS, fontSize: 7.5, lineHeight: 10, color: ink },
  num: { fontFamily: MONO, fontSize: 7.5, lineHeight: 10, letterSpacing: -0.2 },
  th: { fontWeight: '700', color: toner },
  colLoad: { width: 38, paddingLeft: 2 },
  colWhat: { flex: 1, paddingRight: 6 },
  colAmt: { width: 60, textAlign: 'right', paddingRight: 2 },
});
