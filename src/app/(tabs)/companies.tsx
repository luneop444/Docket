import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { Card, Fake, Gap, Pill, Row, Seg, T } from '../../components/ui';
import { dur, money } from '../../logic/format';
import { MIN_REPORTS, SAMPLE_BOARD } from '../../logic/sampleData';
import type { CompanySort } from '../../logic/state';
import { useStore } from '../../state/AppStore';
import { color } from '../../theme/tokens';

/** v1 18: Companies */
export default function Companies() {
  const { s, a } = useStore();
  const enough = (c: { reported: number }) => c.reported >= MIN_REPORTS;
  const list = [...SAMPLE_BOARD].sort(
    (x, y) =>
      Number(enough(y)) - Number(enough(x)) ||
      (s.sort === 'wait' ? parseFloat(x.avg) - parseFloat(y.avg) || x.past - y.past : y.paid - x.paid),
  );
  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodySmall">What waiting looks like at each company</T>
      <Gap h={12} />
      <Seg<CompanySort>
        label="Sort companies by"
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
          <Card key={c.name} onPress={() => router.push({ pathname: '/company-info', params: { name: c.name } })}>
            <Row base>
              <T v="bodyStrong" style={styles.name}>{c.name}</T>
              <View style={styles.end}>
                {c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
                <ChevronRight size={18} c={color.sub} />
              </View>
            </Row>
            <T v="bodyTiny">
              {dur(c.rules.free)} free from {c.rules.start === 'appt' ? 'appointment' : 'arrival'}, then{' '}
              {money(c.rules.rate)}/hr
            </T>
            {enough(c) ? (
              <View style={styles.stats}>
                <Stat value={c.avg} label="average wait per stop" />
                <Stat value={`${c.past}%`} label="of stops past free time" />
                <Stat value={`${c.paid}%`} label="say detention was paid" />
              </View>
            ) : (
              // Too few reports: showing numbers could point to the few drivers who reported.
              <View style={[styles.stats, styles.hidden]}>
                <T v="bodySmall">
                  Not enough reports yet. Stats show once {MIN_REPORTS} drivers have reported, so no one can be singled
                  out.
                </T>
              </View>
            )}
            <Gap h={8} />
            <T v="bodyTiny">{enough(c) ? `${c.reported} drivers reported` : `${c.reported} of ${MIN_REPORTS} reports so far`}</T>
          </Card>
        ))}
      </View>
      <Gap h={16} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Made-up companies and numbers. Real carriers only appear here once their own drivers have
        reported. After Concept Lock this is a secondary feature, not part of the core use case.
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
  name: { flexShrink: 1 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: color.bg, borderRadius: 10, borderCurve: 'continuous', padding: 10 },
  statValue: { fontSize: 17 },
  hidden: { backgroundColor: color.bg, borderRadius: 10, borderCurve: 'continuous', padding: 12 },
  statLabel: { fontSize: 12, lineHeight: 15.6, marginTop: 2 },
});
