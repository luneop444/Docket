import { StyleSheet, Text, View } from 'react-native';
import type { Claim } from '../logic/claims';
import { money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { color, fontFamily } from '../theme/tokens';

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
          <Text style={styles.title}>Driver settlement</Text>
          <Text style={styles.meta}>Pay date {label} · Driver #20417</Text>
        </View>
        <Text style={styles.stamp}>SAMPLE</Text>
      </View>
      <View style={styles.rule} />
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cell, styles.colLoad, styles.th]}>Load</Text>
        <Text style={[styles.cell, styles.colWhat, styles.th]}>Description</Text>
        <Text style={[styles.cell, styles.colAmt, styles.th]}>Amount</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, highlight && r.what === 'Detention' && styles.hit]}>
          <Text style={[styles.cell, styles.colLoad]}>{r.load}</Text>
          <Text style={[styles.cell, styles.colWhat]} numberOfLines={1}>{r.what}</Text>
          <Text style={[styles.cell, styles.colAmt]}>{r.amt < 0 ? `(${money(-r.amt)})` : money(r.amt)}</Text>
        </View>
      ))}
      <View style={styles.rule} />
      <View style={styles.row}>
        <Text style={[styles.cell, styles.colLoad]} />
        <Text style={[styles.cell, styles.colWhat, styles.th]}>Net pay</Text>
        <Text style={[styles.cell, styles.colAmt, styles.th]}>{money(net)}</Text>
      </View>
      {/* What the rest of a real statement carries, down the page: miles and year to date. */}
      <View style={styles.rule} />
      <View style={styles.row}>
        <Text style={[styles.cell, styles.colLoad]} />
        <Text style={[styles.cell, styles.colWhat]}>Paid miles this period</Text>
        <Text style={[styles.cell, styles.colAmt]}>{(1840 + claims.length * 212).toLocaleString('en-US')}</Text>
      </View>
      {/* The deductions block every statement carries, so the page reads full to the tear. */}
      <Text style={[styles.meta, styles.ytdHead]}>Deductions this period</Text>
      {[
        ['Occupational accident', -38.5],
        ['Escrow', -50],
        ['Plate program', -22.75],
      ].map(([k, v]) => (
        <View key={k as string} style={styles.row}>
          <Text style={[styles.cell, styles.colLoad]} />
          <Text style={[styles.cell, styles.colWhat]}>{k}</Text>
          <Text style={[styles.cell, styles.colAmt]}>{`(${money(-(v as number))})`}</Text>
        </View>
      ))}
      <View style={styles.fill} />
      <View style={styles.tear} />
      <Text style={[styles.meta, styles.ytdHead]}>Year to date</Text>
      {[
        ['Gross', 41380.25],
        ['Net', 37468.25],
      ].map(([k, v]) => (
        <View key={k as string} style={styles.row}>
          <Text style={[styles.cell, styles.colLoad]} />
          <Text style={[styles.cell, styles.colWhat]}>{k}</Text>
          <Text style={[styles.cell, styles.colAmt]}>{(v as number) < 0 ? `(${money(-(v as number))})` : money(v as number)}</Text>
        </View>
      ))}
    </View>
  );
}

const ink = 'rgba(28,28,28,0.78)';
const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 6 },
  tear: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(28,28,28,0.3)', marginBottom: 4 },
  ytdHead: { marginBottom: 1 },
  page: { width: '100%', height: '100%', backgroundColor: '#F6F4EF', paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fontFamily.semibold, fontSize: 11, color: color.ink },
  meta: { fontFamily: fontFamily.regular, fontSize: 8, color: ink, marginTop: 2 },
  stamp: { fontFamily: fontFamily.semibold, fontSize: 8, letterSpacing: 1, color: color.flag, borderWidth: 1, borderColor: color.flag, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(28,28,28,0.3)', marginVertical: 3 },
  row: { flexDirection: 'row', paddingVertical: 2 },
  headRow: { paddingBottom: 3 },
  // What was read, marked once it's found.
  hit: { backgroundColor: color.signal, borderRadius: 2 },
  cell: { fontFamily: fontFamily.regular, fontSize: 8, color: ink },
  th: { fontFamily: fontFamily.semibold, color: color.ink },
  colLoad: { width: 38 },
  colWhat: { flex: 1, paddingRight: 6 },
  colAmt: { width: 56, textAlign: 'right' },
});
