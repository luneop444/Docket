import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { settlementDue } from '../logic/claims';
import { money } from '../logic/format';
import { useStore } from '../state/AppStore';
import { useClaims } from '../state/useClaims';
import { useNow } from '../state/useNow';
import { color } from '../theme/tokens';
import { Button, Card, Gap, T } from './ui';

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
  const go = (how: 'scan' | 'type') => router.push(`/settlement?go=${how}`);

  return (
    <>
      <Gap h={32} />
      <Card>
        <View style={styles.tag}>
          <T v="labelSmall" c={color.bg}>Settlement day</T>
        </View>
        <Gap h={12} />
        <T v="numberS">Check your latest settlement</T>
        <Gap h={6} />
        <T v="bodySmall">
          {carried
            ? `${money(owed)} of detention still owed on ${n} load${n > 1 ? 's' : ''}, ${carried} carried over from the last one.`
            : `You claimed ${money(owed)} of detention for ${n} load${n > 1 ? 's' : ''}.`}
        </T>
        <Gap h={16} />
        <Button label="Scan the settlement" onPress={() => go('scan')} />
        <Gap h={8} />
        {/* The second way in, as the design system's secondary button on a card (white). */}
        <Button label="Type the detention total" variant="white" onPress={() => go('type')} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', backgroundColor: color.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
});
