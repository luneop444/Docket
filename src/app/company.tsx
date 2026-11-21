import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View, type HostInstance, type ScrollViewInstance, type ImageSourcePropType } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { EyeSlashIcon, SearchIcon, TruckOutlineIcon } from '../components/Icons';
import { INDEX_LETTERS, LetterIndex } from '../components/LetterIndex';
import { Gap, noFocusRing, Option, T } from '../components/ui';
import { COMPANIES, SUGGESTED } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { color, glass, type } from '../theme/tokens';

/**
 * Logos for the six popular carriers, from the team's Figma (Onboarding v3, E1 Pick company,
 * component "Carrier logo"). Exported at 3x with transparent backgrounds; sizes are the Figma
 * sizes in pt.
 * Short names are the ones the Figma tiles use.
 */
const LOGOS: Record<string, { src: ImageSourcePropType; w: number; h: number; short: string }> = {
  'Swift Transportation': { src: require('../../assets/carriers/swift.png'), w: 89, h: 29, short: 'Swift Transportation' },
  'Schneider National': { src: require('../../assets/carriers/schneider.png'), w: 108, h: 24, short: 'Schneider National' },
  'J.B. Hunt Transport': { src: require('../../assets/carriers/jbhunt.png'), w: 80, h: 32, short: 'J.B. Hunt' },
  'FedEx Freight': { src: require('../../assets/carriers/fedex-freight.png'), w: 77, h: 34, short: 'FedEx Freight' },
  'Werner Enterprises': { src: require('../../assets/carriers/werner.png'), w: 88, h: 30, short: 'Werner Enterprises' },
  'Prime Inc.': { src: require('../../assets/carriers/prime.png'), w: 92, h: 28, short: 'Prime Inc.' },
};

/** v1 02 Pick company (onboarding step 1; v2 starts from the company's reported rules) */
export default function PickCompany() {
  const { a } = useStore();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const q = query.trim();
  const hits = q ? COMPANIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const exact = COMPANIES.some((c) => c.name.toLowerCase() === q.toLowerCase());
  /** Every company A–Z, grouped by first letter like Contacts. Shown under the suggestions. */
  const byLetter = [...COMPANIES]
    .sort((x, y) => x.name.localeCompare(y.name))
    .reduce<[string, typeof COMPANIES][]>((groups, c) => {
      const letter = /[a-z]/i.test(c.name[0]) ? c.name[0].toUpperCase() : '#';
      const last = groups[groups.length - 1];
      if (last && last[0] === letter) last[1].push(c);
      else groups.push([letter, [c]]);
      return groups;
    }, []);

  // A–Z index. Positions are measured on screen at the moment they're needed:
  // stored layout values go stale on the web once fonts load and text reflows.
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const list = useRef<HostInstance>(null);
  const sections = useRef<Record<string, HostInstance | null>>({});
  const [showIndex, setShowIndex] = useState(false);
  function onScrollY(y: number) {
    scrollY.current = y;
    if (q || !scroll.current || !list.current) return setShowIndex(false);
    const sv = scroll.current;
    const ls = list.current;
    sv.measureInWindow((_x, top, _w, h) =>
      ls.measureInWindow((_x2, listTop) => setShowIndex(listTop < top + h * 0.6)),
    );
  }
  function jump(letter: string) {
    // Like Contacts: a letter with no companies jumps to the next one that has some.
    const from = INDEX_LETTERS.indexOf(letter);
    const target = INDEX_LETTERS.slice(from).find((l) => sections.current[l]) ?? byLetter[byLetter.length - 1]?.[0];
    const node = target ? sections.current[target] : null;
    const sv = scroll.current;
    if (!node || !sv) return;
    sv.measureInWindow((_x, top) =>
      node.measureInWindow((_x2, y) => sv.scrollTo({ y: Math.max(0, scrollY.current + y - top), animated: false })),
    );
  }

  function pick(name: string, custom: boolean) {
    a.pickCompany(name, custom);
    router.push(custom ? '/edit-rules' : '/company-rules');
  }

  return (
    <Screen
      step={1}
      header={<OnboardingBar step={1} onBack={() => router.navigate('/welcome')} />}
      scrollRef={scroll}
      onScrollY={onScrollY}
      overlay={<LetterIndex onLetter={jump} visible={showIndex && !q} />}
    >
      <T v="h2">Who do you drive for?</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>Each company pays detention its own way.</T>
      <Gap h={20} />
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <SearchIcon c={color.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search or add your company"
          placeholderTextColor={color.faint}
          autoCorrect={false}
          autoComplete="off"
          style={styles.input}
          accessibilityLabel="Company name"
        />
      </View>
      <Gap h={24} />
      {!q ? (
        <>
          <T v="labelSmall">Popular with drivers</T>
          <Gap h={10} />
          {/* Six visible before scrolling: Plaid found more visible choices meant fewer people had to search. */}
          <View style={styles.grid}>
            {SUGGESTED.map((c) => (
              <Pressable
                key={c.name}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${c.drivers} drivers on Docket`}
                onPress={() => pick(c.name, false)}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              >
                {/* One card: the logo straight on the tile, the name under it, both centered. */}
                <View style={styles.logoBox}>
                  {LOGOS[c.name] ? (
                    <Image
                      source={LOGOS[c.name].src}
                      style={{ width: LOGOS[c.name].w, height: LOGOS[c.name].h }}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                  ) : (
                    <T v="labelPill">{c.name}</T>
                  )}
                </View>
                <T v="bodySmall" c={color.sub} numberOfLines={1} style={styles.tileName}>
                  {LOGOS[c.name]?.short ?? c.name}
                </T>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {!q ? (
        <>
          {/* Audit #3: not every driver has a company to name. These go straight to entering your own rules. */}
          <Gap h={16} />
          <View style={{ gap: 10 }}>
            <Option
              icon={(c) => <TruckOutlineIcon c={c} />}
              label="I’m an owner-operator"
              sub="You’ll enter your own rules"
              onPress={() => pick('', true)}
            />
            <Option
              icon={(c) => <EyeSlashIcon c={c} size={20} />}
              label="I’d rather not say"
              sub="Nothing is counted"
              onPress={() => pick('', true)}
            />
          </View>
        </>
      ) : null}
      <View style={{ gap: 8 }}>
        {hits.map((c) => (
          <Option key={c.name} label={c.name} sub={`${c.drivers} drivers on Docket`} onPress={() => pick(c.name, false)} />
        ))}
        {q && !exact ? (
          <Option label={`Add “${q}”`} sub="Not listed yet. You’ll enter your company’s rules." onPress={() => pick(q, true)} />
        ) : null}
      </View>
      {!q ? (
        <>
          <Gap h={32} />
          <View ref={list}>
            <T v="labelPill">All companies</T>
            {byLetter.map(([letter, list], i) => (
              <View
                key={letter}
                ref={(n) => {
                  sections.current[letter] = n;
                }}
                style={{ paddingTop: i === 0 ? 16 : 24 }}
              >
                <T v="labelPill" c={color.sub} accessibilityRole="header">
                  {letter}
                </T>
                <View style={styles.rule} />
                {list.map((c) => (
                  <Pressable
                    key={c.name}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name}, ${c.drivers} drivers on Docket`}
                    onPress={() => pick(c.name, false)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <T v="body">{c.name}</T>
                    <T v="bodyTiny" c={color.sub}>{c.drivers} drivers on Docket</T>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Figma E1 Search: 50 tall, a pill, 16 in, 10 between the glass and the text.
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 25, borderCurve: 'continuous',
    ...glass,
  },
  fieldFocus: { backgroundColor: color.bg, boxShadow: `inset 0 0 0 2px ${color.ink}` },
  // One squircle per carrier: 16 padding, the logo then its name. The logos are transparent,
  // so no plate is needed. Centered: logos run 77 to 108 wide, and a short single-line name
  // under a centered logo reads as one unit in a two-column grid.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    gap: 12,
    borderRadius: 20, borderCurve: 'continuous',
    ...glass,
  },
  tilePressed: { backgroundColor: color.line },
  // The tallest logo is 34; every logo sits in the same 36 band so the names line up.
  logoBox: { height: 36, justifyContent: 'center', alignItems: 'center' },
  tileName: { textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line, marginTop: 8, marginRight: 24 },
  // Compact like Contacts; right padding leaves room for the A–Z strip.
  row: {
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: 8,
    // Margin, not padding, so the divider stops short of the A–Z strip like Contacts.
    marginRight: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  rowPressed: { backgroundColor: color.raise },
  input: { ...type.body, fontSize: 17, flex: 1, minWidth: 0, color: color.ink, ...noFocusRing },
});
