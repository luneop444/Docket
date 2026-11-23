import { router } from 'expo-router';
import { Fragment } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LOGOS } from '../../components/carrierLogos';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { Card, Fake, Gap, Hr, Pill, press, Seg, T } from '../../components/ui';
import { initials, noStatsNote, REAL_CARRIERS, showsStats } from '../../logic/companyInfo';
import { dur, money } from '../../logic/format';
import { SAMPLE_BOARD, type Company } from '../../logic/sampleData';
import type { CompanySort } from '../../logic/state';
import { useStore } from '../../state/AppStore';
import { color, radius } from '../../theme/tokens';

const open = (name: string) => router.push({ pathname: '/company-info', params: { name } });
const rulesShort = (c: Company) =>
  `${dur(c.rules.free)} free from ${c.rules.start === 'appt' ? 'appointment' : 'arrival'}, then ${money(c.rules.rate)}/hr`;

/** v1 18: Companies. Real carriers (logos, no stats) on top, then what drivers report. */
export default function Companies() {
  const { s, a } = useStore();
  const board = [...SAMPLE_BOARD].sort(
    (x, y) =>
      Number(showsStats(y)) - Number(showsStats(x)) ||
      (s.sort === 'wait' ? parseFloat(x.avg) - parseFloat(y.avg) || x.past - y.past : y.paid - x.paid),
  );
  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodySmall">What waiting looks like at each company</T>

      <Gap h={24} />
      <T v="bodyStrong">Popular carriers</T>
      <Gap h={10} />
      <Card style={styles.list}>
        {REAL_CARRIERS.map((c, i) => (
          <Fragment key={c.name}>
            {i > 0 ? <Hr /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${rulesShort(c)}`}
              onPress={() => open(c.name)}
              style={({ pressed }) => [styles.carrier, pressed && press.give]}
            >
              <View style={styles.logoBox}>
                <Image
                  source={LOGOS[c.name].src}
                  style={{ width: LOGOS[c.name].w, height: LOGOS[c.name].h }}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <T v="bodyTiny" style={styles.flex}>
                {dur(c.rules.free)} free, then {money(c.rules.rate)}/hr
              </T>
              {c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
              <ChevronRight size={18} c={color.faint} />
            </Pressable>
          </Fragment>
        ))}
      </Card>
      <Gap h={8} />
      <T v="bodyTiny">{noStatsNote(REAL_CARRIERS[0])}</T>

      <Gap h={32} />
      <T v="bodyStrong">What drivers report</T>
      <Gap h={10} />
      <Seg<CompanySort>
        label="Sort companies by"
        options={[
          { key: 'wait', label: 'Shortest waits' },
          { key: 'paid', label: 'Most often paid' },
        ]}
        value={s.sort}
        onChange={a.setSort}
      />
      <Gap h={12} />
      <View style={{ gap: 12 }}>
        {board.map((c) => (
          <Card key={c.name} onPress={() => open(c.name)}>
            <View style={styles.head}>
              <View style={styles.tile}>
                <T v="labelSmall">{initials(c.name)}</T>
              </View>
              <View style={styles.flex}>
                <T v="bodyStrong">{c.name}</T>
                <T v="bodyTiny">{rulesShort(c)}</T>
              </View>
              {c.name === s.company ? <Pill label="Yours" tone="signal" /> : null}
              <ChevronRight size={18} c={color.faint} />
            </View>
            <Hr style={styles.rule} />
            {showsStats(c) ? (
              <>
                <View style={styles.stats}>
                  <Stat value={c.avg} label="average wait" />
                  <Stat value={`${c.past}%`} label="past free time" />
                  <Stat value={`${c.paid}%`} label="say it was paid" />
                </View>
                <Gap h={10} />
                <T v="bodyTiny">{c.reported} drivers reported</T>
              </>
            ) : (
              <T v="bodySmall">{noStatsNote(c)}</T>
            )}
          </Card>
        ))}
      </View>
      <Gap h={16} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Made-up companies and numbers until drivers report for real.
      </T>
    </Screen>
  );
}

/** A figure and what it means, as plain text: these aren't buttons. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.flex}>
      <T v="numberS" numberOfLines={1}>{value}</T>
      <T v="bodyTiny">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  list: { paddingVertical: 4 },
  carrier: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10 },
  // The widest Figma logo is 108; one box keeps the rules text lined up on every row.
  logoBox: { width: 108, height: 36, justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.raise2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { marginVertical: 14 },
  stats: { flexDirection: 'row', gap: 12 },
});
