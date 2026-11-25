import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { LOGOS } from '../../components/carrierLogos';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight } from '../../components/Icons';
import { Tappable } from '../../components/Tappable';
import { Card, Gap, ListCard, ListRow, Pill, Seg, T } from '../../components/ui';
import { calc, rulesLine } from '../../logic/detention';
import { dur } from '../../logic/format';
import type { LoggedStop } from '../../logic/history';
import { NATIONAL, POLICIES, recommended, sortPolicies, staleYear, type CompanySort, type Policy, type Source } from '../../logic/policies';
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

/** A source as a small link: the label and when it's from, opening the page. */
function SourceLink({ src }: { src: Source }) {
  return (
    <Tappable
      accessibilityRole="link"
      accessibilityLabel={`${src.label}, ${src.when}. Opens the page.`}
      onPress={() => Linking.openURL(src.url)}
      highlight="fade"
      hitSlop={6}
    >
      <T v="bodyTiny" style={styles.link}>{`${src.label} · ${src.when}`}</T>
    </Tappable>
  );
}

function PolicyCard({ p }: { p: Policy }) {
  const old = staleYear(p);
  return (
    <Card>
      <View style={styles.head}>
        <T v="bodyStrong" style={styles.name}>{p.company}</T>
        {recommended(p) ? <Pill label="Recommended" tone="signal" /> : null}
      </View>
      <T v="bodyTiny">{p.scope ? `${p.segment} · ${p.scope}` : p.segment}</T>
      <Gap h={6} />
      <T v="bodySmall">{p.line}</T>
      {old ? (
        <>
          <Gap h={4} />
          <T v="bodyTiny" style={{ color: color.flag }}>{`Last published ${old}. It may have changed.`}</T>
        </>
      ) : null}
      {p.sources.length ? <Gap h={8} /> : null}
      {p.sources.map((src) => (
        <SourceLink key={src.url} src={src} />
      ))}
    </Card>
  );
}

const SORTS: { key: CompanySort; label: string }[] = [
  { key: 'best', label: 'Best first' },
  { key: 'rate', label: 'Top rate' },
  { key: 'by2h', label: 'Paid by 2h' },
];

type PlaceSort = 'most' | 'shortest';

/**
 * Companies: only what's real (Dan, 24 Nov: no sample data). The driver's own company and the
 * rules they entered; then every other company's published waiting policy, each with its source
 * (researched 24 Nov, see logic/policies.ts), recommended first; then the places they've stopped,
 * from their own timed stops. Other drivers' reports need drivers reporting, so that part waits.
 */
export default function Companies() {
  const { s } = useStore();
  const [sort, setSort] = useState<CompanySort>('best');
  const [placeSort, setPlaceSort] = useState<PlaceSort>('most');
  const all = placesFrom(s.history, s.rules);
  const places = placeSort === 'shortest' ? [...all].sort((a, b) => a.wait - b.wait || a.name.localeCompare(b.name)) : all;
  const logo = s.company ? LOGOS[s.company] : undefined;
  const others = sortPolicies(
    POLICIES.filter((p) => p.company !== s.company),
    sort,
  );

  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodyStrong">Your company</T>
      <Gap h={10} />
      <Card onPress={() => router.push('/rules')}>
        <View style={styles.row}>
          <View style={styles.body}>
            {logo ? (
              <Image source={logo.src} style={{ width: logo.w, height: logo.h }} resizeMode="contain" accessibilityIgnoresInvertColors />
            ) : null}
            <T v="bodyStrong">{s.company ?? 'Your company'}</T>
            <T v="bodySmall">{rulesLine(s.rules)}</T>
            <T v="bodyTiny">The rules you entered</T>
          </View>
          <ChevronRight size={16} c={color.faint} />
        </View>
      </Card>

      <Gap h={32} />
      <T v="bodyStrong">Other companies</T>
      <Gap h={4} />
      <T v="bodyTiny">
        What each company has published about paying drivers for waiting, and where it’s from. Your account can differ.
      </T>
      <Gap h={12} />
      <Seg options={SORTS} value={sort} onChange={setSort} label="Sort other companies" />
      <Gap h={8} />
      <T v="bodyTiny">
        {sort === 'best'
          ? 'Recommended: every hour on duty is paid, or detention is paid whether or not the customer pays.'
          : sort === 'rate'
            ? 'Highest published hourly rate for waiting first. Companies with no rate come last.'
            : 'Waiting is paid within 2 hours: hourly pay, or published free time of 2 hours or less.'}
      </T>
      <Gap h={12} />
      <View style={styles.list}>
        {others.map((p) => (
          <PolicyCard key={p.company} p={p} />
        ))}
      </View>
      <Gap h={12} />
      <T v="bodyTiny">{`Across the country: ${NATIONAL.line}`}</T>
      <SourceLink src={NATIONAL.source} />

      <Gap h={32} />
      <T v="bodyStrong">Places you’ve stopped</T>
      <Gap h={4} />
      <T v="bodyTiny">From the stops you timed.</T>
      <Gap h={10} />
      {all.length > 1 ? (
        <>
          <Seg
            options={[
              { key: 'most', label: 'Most stops' },
              { key: 'shortest', label: 'Shortest wait' },
            ]}
            value={placeSort}
            onChange={setPlaceSort}
            label="Sort places"
          />
          <Gap h={10} />
        </>
      ) : null}
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1 },
  list: { gap: 10 },
  link: { color: color.sub, textDecorationLine: 'underline' },
});
