import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Screen, TopBar } from '../components/Chrome';
import { ChecklistIcon, DocIcon, LocationIcon } from '../components/Icons';
import { Button, Card, Gap, IconTile, T, type IconFn } from '../components/ui';
import { color } from '../theme/tokens';

/**
 * v1 01 Welcome. The headline, then what Docket does as three short rows, each one card (24 Nov:
 * the time bar, icon rows with subtitles and a privacy paragraph read as a wall of text, and the
 * paragraph ran under the button). The labels say it alone; "your company's rules", not "your
 * rules", since a driver doesn't set them. Privacy is one line under the button.
 */
const STEPS: { icon: IconFn; label: string }[] = [
  { icon: (c) => <LocationIcon c={c} size={22} />, label: 'Times your stops' },
  { icon: (c) => <ChecklistIcon c={c} size={22} />, label: 'Uses your company’s rules' },
  { icon: (c) => <DocIcon c={c} size={22} />, label: 'Checks your pay' },
];

export default function Welcome() {
  return (
    <Screen
      header={<TopBar />}
      footer={
        <>
          <Button label="Get started" onPress={() => router.push('/company')} />
          {/* Audit #1: scans go to the AI reader, so "stays on your phone" can't cover everything. */}
          <T v="bodyTiny" c={color.faint} style={styles.privacy}>
            Your times and pay stay on your phone.{'\n'}Scans are read once by AI, never kept or shared.
          </T>
        </>
      }
    >
      <Gap h={24} />
      <T v="h1">Know what you’re owed for every hour at the dock.</T>
      <Gap h={32} />
      <View style={styles.steps}>
        {STEPS.map((s) => (
          <Card key={s.label} style={styles.step}>
            <IconTile icon={s.icon} tone="white" size={48} />
            <T v="bodyStrong" style={styles.label}>
              {s.label}
            </T>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  label: { flex: 1 },
  privacy: { textAlign: 'center' },
});
