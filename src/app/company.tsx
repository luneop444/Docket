import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { SearchIcon } from '../components/Icons';
import { Fake, Gap, noFocusRing, Option, T } from '../components/ui';
import { COMPANIES, SUGGESTED } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { color, radius, type } from '../theme/tokens';

/** v1 02 Pick company (onboarding step 1; v2 starts from the company's reported rules) */
export default function PickCompany() {
  const { a } = useStore();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const q = query.trim();
  const hits = q ? COMPANIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : SUGGESTED;
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

  function pick(name: string, custom: boolean) {
    a.pickCompany(name, custom);
    router.push(custom ? '/edit-rules' : '/company-rules');
  }

  return (
    <Screen header={<OnboardingBar step={1} onBack={() => router.navigate('/welcome')} />}>
      <T v="h2">Who do you drive for?</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>Each company sets its own detention rules, so Docket starts from yours.</T>
      <Gap h={20} />
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <SearchIcon />
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
      <Gap h={16} />
      {!q ? (
        <>
          <T v="bodyTiny" c={color.sub}>Most drivers on Docket</T>
          <Gap h={8} />
        </>
      ) : null}
      <View style={{ gap: 8 }}>
        {hits.map((c) => (
          <Option key={c.name} label={c.name} sub={`${c.drivers} drivers on Docket`} onPress={() => pick(c.name, false)} />
        ))}
        {q && !exact ? (
          <Option label={`Add “${q}”`} sub="Not listed yet. You’ll enter your company’s rules." onPress={() => pick(q, true)} />
        ) : null}
        {!hits.length && !q ? <T v="bodySmall">Start typing your company’s name.</T> : null}
      </View>
      <Gap h={16} />
      <T v="bodyTiny">
        <Fake label="Sample data" /> Real company names. Driver counts and rules are made up for this prototype. Not listed? Type it to add it.
      </T>
      {!q ? (
        <>
          <Gap h={28} />
          <T v="bodyTiny" c={color.sub}>All companies</T>
          {byLetter.map(([letter, list]) => (
            <View key={letter}>
              <Gap h={16} />
              <T v="bodyTiny" c={color.faint} accessibilityRole="header">{letter}</T>
              <Gap h={8} />
              <View style={{ gap: 8 }}>
                {list.map((c) => (
                  <Option key={c.name} label={c.name} sub={`${c.drivers} drivers on Docket`} onPress={() => pick(c.name, false)} />
                ))}
              </View>
            </View>
          ))}
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
    height: 56,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    backgroundColor: color.raise,
  },
  fieldFocus: { backgroundColor: color.bg, boxShadow: `inset 0 0 0 2px ${color.ink}` },
  input: { ...type.body, fontSize: 17, flex: 1, minWidth: 0, color: color.ink, ...noFocusRing },
});
