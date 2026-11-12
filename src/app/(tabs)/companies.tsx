import { StyleSheet, View } from 'react-native';
import { PageHead, Screen } from '../../components/Chrome';
import { Card, Fake, Gap, Pill, Row, Seg, T } from '../../components/ui';
import { dur, money } from '../../logic/format';
import { COMPANIES } from '../../logic/sampleData';
import type { CompanySort } from '../../logic/state';
import { useStore } from '../../state/AppStore';
import { color } from '../../theme/tokens';

/** v1 18: Companies */
export default function Companies() {
  const { s, a } = useStore();
  const list = [...COMPANIES].sort((x, y) =>
    s.sort === 'wait' ? parseFloat(x.avg) - parseFloat(y.avg) || x.past - y.past : y.paid - x.paid,
  );
  return (
    <Screen header={<PageHead title="Companies" />}>
      <T v="bodySmall">What waiting looks like at each company</T>
      <Gap h={12} />
      <Seg<CompanySort>
        options={[
          { key: 'wait', label: 'Shortest waits' },
          { key: 'paid', label: 'Most often paid' },
        ]}
        value={s.sort}
        onChange={a.setSort}
      />
      <Gap h={16} />
      <View style={{ gap: 12 }}>
        {list.map((c) => (
          <Card key={c.name}>
            <Row base>
              <T v="bodyStrong">{c.name}</T>
              {c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
            </Row>
            <T v="bodyTiny">
              {dur(c.rules.free)} free from {c.rules.start === 'appt' ? 'appointment' : 'arrival'}, then{' '}
              {money(c.rules.rate)}/hr
            </T>
            <View style={styles.stats}>
              <Stat value={c.avg} label="average wait per stop" />
              <Stat value={`${c.past}%`} label="of stops past free time" />
              <Stat value={`${c.paid}%`} label="say detention was paid" />
            </View>
            <Gap h={8} />
            <T v="bodyTiny">
              {c.drivers} drivers{c.drivers < 20 ? ' · too few to rely on yet' : ''}
            </T>
          </Card>
        ))}
      </View>
      <Gap h={16} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Real company names, made-up numbers. After Concept Lock this is a secondary feature, not
        part of the core use case.
      </T>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <T v="numberS" style={styles.statValue} numberOfLines={1}>{value}</T>
      <T v="bodyTiny" style={styles.statLabel}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: color.bg, borderRadius: 16, padding: 10 },
  statValue: { fontSize: 17 },
  statLabel: { fontSize: 12, lineHeight: 15.6, marginTop: 2 },
});
