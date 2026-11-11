import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { SearchIcon } from '../components/Icons';
import { Fake, Gap, Option, T } from '../components/ui';
import { COMPANIES } from '../logic/sampleData';
import { useStore } from '../state/AppStore';
import { color, radius, type } from '../theme/tokens';

/** v1 02 Pick company */
export default function PickCompany() {
  const { a } = useStore();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const q = query.trim();
  const hits = COMPANIES.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  const exact = COMPANIES.some((c) => c.name.toLowerCase() === q.toLowerCase());

  function pick(name: string, custom: boolean) {
    a.pickCompany(name, custom);
    router.push('/paytype');
  }

  return (
    <Screen header={<BackBar onPress={() => router.navigate('/welcome')} />}>
      <T v="h2">Who do you drive for?</T>
      <Gap h={8} />
      <T v="bodySmall">Each company sets its own detention rules, so Docket starts from yours.</T>
      <Gap h={20} />
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <SearchIcon />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Company name"
          placeholderTextColor={color.faint}
          autoCorrect={false}
          autoComplete="off"
          style={styles.input}
          accessibilityLabel="Company name"
        />
      </View>
      <Gap h={16} />
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
        <Fake label="Sample data" /> Company names here are made up for this prototype. Type your real company to add it.
      </T>
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
  input: { ...type.body, fontSize: 17, flex: 1, minWidth: 0, color: color.ink, outlineStyle: 'none' } as object,
});
