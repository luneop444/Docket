import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { LOGOS } from '../../components/carrierLogos';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { Card, Gap, ListCard, ListRow, Pill, T } from '../../components/ui';
import { calc, rulesLine } from '../../logic/detention';
import { dur } from '../../logic/format';
import type { LoggedStop } from '../../logic/history';
import { useStore } from '../../state/AppStore';
import { color } from '../../theme/tokens';

/** Each place the driver has stopped, from their own logged stops: visits, typical wait, times past free. */
interface Place {
  name: string;
  visits: number;
  /** Median wait, minutes. */
  wait: number;
  pastFree: number;
}

function placesFrom(history: LoggedStop[], rules: Parameters<typeof calc>[4]): Place[] {
  const by = new Map<string, LoggedStop[]>();
  for (const h of history) by.set(h.place, [...(by.get(h.place) ?? []), h]);
  return [...by.entries()]
    .map(([name, hs]) => {
      const waits = hs.map((h) => h.leave - h.arrive).sort((a, b) => a - b);
      return {
        name,
        visits: hs.length,
        wait: waits[Math.floor(waits.length / 2)],
        pastFree: hs.filter((h) => calc(h.arrive, h.appt, h.leave, h.brk, rules).owed > 0).length,
      };
    })
    .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
}

/**
 * Companies: only what's real (Dan, 24 Nov: no sample data). The driver's own company and the
 * rules they entered, then the places they've stopped, from their own timed stops. Other
 * drivers' reports need drivers reporting, so that part waits instead of showing made-up
 * companies and numbers.
 */
export default function Companies() {
  const { s } = useStore();
  const places = placesFrom(s.history, s.rules);
  const logo = s.company ? LOGOS[s.company] : undefined;

  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodyStrong">You drive for</T>
      <Gap h={10} />
      <Card onPress={() => router.push('/rules')}>
        <View style={styles.row}>
          <View style={styles.body}>
            {logo ? (
              <Image source={logo.src} style={{ width: logo.w, height: logo.h }} resizeMode="contain" accessibilityIgnoresInvertColors />
            ) : null}
            <T v="bodyStrong">{s.company ?? 'Your company'}</T>
            <T v="bodySmall">{rulesLine(s.rules)}</T>
          </View>
          <ChevronRight size={16} c={color.faint} />
        </View>
      </Card>

      <Gap h={32} />
      <T v="bodyStrong">Places you’ve stopped</T>
      <Gap h={4} />
      <T v="bodyTiny">From the stops you timed.</T>
      <Gap h={10} />
      {places.length ? (
        <ListCard>
          {places.map((p) => (
            <ListRow
              key={p.name}
              accessibilityLabel={`${p.name}, ${p.visits} stop${p.visits > 1 ? 's' : ''}, usually ${dur(p.wait)}`}
              onPress={() => router.push('/history')}
            >
              <View style={styles.body}>
                <T v="bodyStrong">{p.name}</T>
                <T v="bodyTiny">
                  {`${p.visits} stop${p.visits > 1 ? 's' : ''}`}
                  {p.pastFree ? ` · ${p.pastFree} past free time` : ''}
                </T>
              </View>
              <View style={styles.figure}>
                <T v="numberS">{dur(p.wait)}</T>
                <T v="bodyTiny" style={styles.right}>{p.visits > 1 ? 'usual wait' : 'wait'}</T>
              </View>
              <ChevronRight size={16} c={color.faint} />
            </ListRow>
          ))}
        </ListCard>
      ) : (
        <Card>
          <T v="bodySmall">
            Nothing yet. Each shipper and receiver you time a stop at shows up here, with how long you usually wait.
          </T>
        </Card>
      )}

      <Gap h={32} />
      <View style={styles.soonHead}>
        <T v="bodyStrong">Other drivers’ reports</T>
        <Pill label="Not yet" />
      </View>
      <Gap h={4} />
      <T v="bodyTiny">
        How long drivers wait at each company, and how often detention gets paid, shows here once enough drivers share their stops.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  figure: { alignItems: 'flex-end', maxWidth: 110 },
  right: { textAlign: 'right' },
  soonHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
