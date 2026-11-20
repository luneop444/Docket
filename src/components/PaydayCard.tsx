import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { settlementDue } from '../logic/claims';
import { money } from '../logic/format';
import { useStore } from '../state/AppStore';
import { useClaims } from '../state/useClaims';
import { useNow } from '../state/useNow';
import { color } from '../theme/tokens';
import { DocIcon } from './Icons';
import { Button, Card, Fake, Gap, press, T } from './ui';

/**
 * Settlement day on Today: one check, not a tab. It says what to do (check the settlement)
 * and what's being checked, and the buttons are the two ways to do it.
 */
export function PaydayCard() {
  const { s } = useStore();
  const claims = useClaims();
  const now = useNow();
  // A stop in progress keeps the top of Today.
  if (s.stop.phase === 'dock' || s.stop.phase === 'arriving') return null;
  const due = settlementDue(claims, now);
  if (!due) return null;
  const n = due.claims.length;
  const owed = due.claims.reduce((t, c) => t + c.left, 0);
  const carried = due.claims.filter((c) => c.missed > 0).length;
  const sample = due.claims[0].sample;
  const go = (how: 'scan' | 'type') => router.push(`/settlement?go=${how}`);

  return (
    <>
      <Gap h={32} />
      <Card>
        <View style={styles.tag}>
          <T v="labelSmall" c={color.bg}>Settlement day</T>
        </View>
        <Gap h={12} />
        <T v="numberS">{sample ? `Check your ${due.label} settlement` : 'Check your latest settlement'}</T>
        <Gap h={6} />
        <T v="bodySmall">
          {carried
            ? `${money(owed)} of detention still owed on ${n} load${n > 1 ? 's' : ''}, ${carried} carried over from the last one.`
            : `You claimed ${money(owed)} of detention for ${n} load${n > 1 ? 's' : ''}.`}
          {sample ? <Fake label="Sample data" /> : null}
        </T>
        <Gap h={16} />
        <Button label="Scan the settlement" icon={<DocIcon c={color.bg} />} onPress={() => go('scan')} />
        <Gap h={12} />
        <Pressable accessibilityRole="button" onPress={() => go('type')} hitSlop={10} style={({ pressed }) => [styles.center, pressed && press.link]}>
          <T v="bodySmall" c={color.ink} style={styles.link}>Or type the detention total</T>
        </Pressable>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', backgroundColor: color.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  center: { alignSelf: 'center' },
  link: { textDecorationLine: 'underline' },
});
