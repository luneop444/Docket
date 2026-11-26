import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, StyleSheet, TextInput, View } from 'react-native';
import { LOGOS } from '../../components/carrierLogos';
import { PageHead, Screen } from '../../components/Chrome';
import { ChevronRight, SearchIcon } from '../../components/Icons';
import { Tappable } from '../../components/Tappable';
import { Card, Gap, ListCard, ListRow, noFocusRing, Pill, Seg, T } from '../../components/ui';
import { calc, rulesShort } from '../../logic/detention';
import { dur } from '../../logic/format';
import type { LoggedStop } from '../../logic/history';
import { NATIONAL, POLICIES, searchPolicies, splitPolicies, type CompanySort, type Policy, type Source } from '../../logic/policies';
import { useStore } from '../../state/AppStore';
import { color, type } from '../../theme/tokens';

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

/** One company in the list: the name, the fact to compare, and a way in to the rest. */
function PolicyRow({ p }: { p: Policy }) {
  const none = p.kind === 'none';
  return (
    <ListRow accessibilityLabel={`${p.company}, ${p.headline}`} onPress={() => router.push({ pathname: '/company-policy', params: { name: p.company } })}>
      <View style={styles.body}>
        <T v="bodyStrong">{p.company}</T>
        <T v="bodySmall" c={none ? color.faint : color.ink}>{p.headline}</T>
      </View>
      <ChevronRight size={16} c={color.faint} />
    </ListRow>
  );
}

function Group({ title, list }: { title?: string; list: Policy[] }) {
  if (!list.length) return null;
  return (
    <>
      <Gap h={title ? 24 : 16} />
      {title ? (
        <>
          <T v="bodyStrong">{title}</T>
          <Gap h={10} />
        </>
      ) : null}
      <ListCard>
        {list.map((p) => (
          <PolicyRow key={p.company} p={p} />
        ))}
      </ListCard>
    </>
  );
}

/** Width of the logo slot on your company's card, in points. */
const LOGO_SLOT = 64;

const SORTS: { key: CompanySort; label: string }[] = [
  { key: 'rate', label: 'Top rate' },
  { key: 'guaranteed', label: 'Guaranteed' },
];

/**
 * The heading over the companies that don't match the chosen chip. The matches get no heading:
 * the dark chip right above them already says what they are (Edward, 25 Nov). This one marks
 * where the order changes, so it says what those companies lack.
 */
const REST: Record<CompanySort, string> = {
  rate: 'Rate unknown',
  guaranteed: 'Not guaranteed or unknown',
};

/**
 * One choice at a time, as chips under the search (Edward, 25 Nov, layout A): both show at
 * once and the dark one says which is on. Chips, not the segmented bar, so they read as their
 * own control.
 */
function Chips({ value, onChange }: { value: CompanySort; onChange: (k: CompanySort) => void }) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Order other companies">
      {SORTS.map((o) => {
        const on = o.key === value;
        return (
          <Tappable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.key)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <T v="bodyStrong" c={on ? color.bg : color.ink} style={styles.chipText}>{o.label}</T>
          </Tappable>
        );
      })}
    </View>
  );
}

type PlaceSort = 'most' | 'shortest';

/**
 * Companies: only what's real (Dan, 24 Nov: no sample data). The driver's own company and the
 * rules they entered; then every other company's published waiting policy, each with its source
 * (researched 24 Nov, see logic/policies.ts), recommended first; then the places they've stopped,
 * from their own timed stops. Other drivers' reports need drivers reporting, so that part waits.
 */
export default function Companies() {
  const { s } = useStore();
  const [sort, setSort] = useState<CompanySort>('rate');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [placeSort, setPlaceSort] = useState<PlaceSort>('most');
  const all = placesFrom(s.history, s.rules);
  const places = placeSort === 'shortest' ? [...all].sort((a, b) => a.wait - b.wait || a.name.localeCompare(b.name)) : all;
  const logo = s.company ? LOGOS[s.company] : undefined;
  const found = searchPolicies(
    POLICIES.filter((p) => p.company !== s.company),
    query,
  );
  const { top, rest } = splitPolicies(found, sort);

  return (
    <Screen tabs header={<PageHead title="Companies" />}>
      <T v="bodyStrong">Your company</T>
      <Gap h={10} />
      <Card onPress={() => router.push('/rules')}>
        <View style={styles.row}>
          {/* Logo on the left, shrunk into one fixed slot so the name starts in the same place for
              every carrier (Edward, 25 Nov). It's only for recognition: the written name beside it
              carries the meaning and grows with text size, so the logo can be small. Carriers with
              no logo get no slot. */}
          {logo ? (
            <View style={styles.logoSlot}>
              <Image
                source={logo.src}
                style={{ width: LOGO_SLOT, height: LOGO_SLOT * (logo.h / logo.w) }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          ) : null}
          <View style={styles.body}>
            <T v="bodyStrong">{s.company ?? 'Your company'}</T>
            {/* Same form and weight as the other companies' rows, so yours compares at a glance.
                No "The rules you entered" line: you entered them, and "Your company" says whose. */}
            <T v="bodySmall" c={color.ink}>{rulesShort(s.rules)}</T>
          </View>
          <ChevronRight size={16} c={color.faint} />
        </View>
      </Card>

      <Gap h={32} />
      {/* The heading says what the rows are (pay for waiting), so no line under it explaining
          that; the chevrons already say a row opens (Edward, 25 Nov). */}
      <T v="bodyStrong">How other companies pay for waiting</T>
      <Gap h={12} />
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <SearchIcon c={color.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search companies"
          placeholderTextColor={color.sub}
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Search other companies"
        />
      </View>
      <Gap h={10} />
      <Chips value={sort} onChange={setSort} />
      {found.length ? null : (
        <>
          <Gap h={24} />
          <T v="bodySmall">{`No company called “${query.trim()}” in Docket’s list yet.`}</T>
        </>
      )}
      <Group list={top} />
      <Group title={REST[sort]} list={rest} />
      <Gap h={12} />
      <T v="bodyTiny">{`Across the country: ${NATIONAL.line}`}</T>
      <SourceLink src={NATIONAL.source} />

      <Gap h={32} />
      <T v="bodyStrong">Places you’ve stopped</T>
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
  logoSlot: { width: LOGO_SLOT, alignItems: 'center' },
  // The same field as the company picker's search: fill and a 1px edge, no lift.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderCurve: 'continuous',
    backgroundColor: color.glass,
    boxShadow: `inset 0 0 0 1px ${color.track}`,
  },
  fieldFocus: { backgroundColor: color.bg, boxShadow: `inset 0 0 0 2px ${color.ink}` },
  input: { ...type.body, fontSize: 17, flex: 1, minWidth: 0, color: color.ink, ...noFocusRing },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    justifyContent: 'center',
    backgroundColor: color.glass,
    boxShadow: `inset 0 0 0 1px ${color.track}`,
  },
  chipOn: { backgroundColor: color.ink, boxShadow: 'none' },
  chipText: { fontSize: 15, lineHeight: 20 },
  body: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  figure: { alignItems: 'flex-end', maxWidth: 110 },
  right: { textAlign: 'right' },
  soonHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { color: color.sub, textDecorationLine: 'underline' },
});
