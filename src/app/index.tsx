import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, type, type TypeToken } from '../theme/tokens';

/**
 * Temporary home screen for step 1: proves the router, fonts, tokens and phone
 * frame work. Replaced by onboarding / Today in later steps.
 */
const samples: [TypeToken, string][] = [
  ['displayTimer', '2:33'],
  ['h1', 'Harbor Foods DC'],
  ['h2', 'Detention rules'],
  ['numberL', '$208.50'],
  ['numberS', '1:48 PM'],
  ['bodyStrong', 'Arrived at gate'],
  ['body', 'Docket logs when you arrive and leave.'],
  ['bodySmall', 'Free time ends at 4:21 PM'],
  ['labelPill', 'Check settlement'],
];

export default function Index() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.mark} />
          <Text style={type.bodyStrong}>Docket</Text>
        </View>
        {samples.map(([token, text]) => (
          <View key={token} style={styles.row}>
            <Text style={[type.bodyTiny, styles.sub]}>{token}</Text>
            <Text style={[type[token], styles.ink]}>{text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  content: { padding: 20, gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  mark: { width: 6, height: 16, backgroundColor: color.signal },
  row: { gap: 2 },
  sub: { color: color.sub },
  ink: { color: color.ink },
});
