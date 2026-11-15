import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { CheckIcon } from '../components/Icons';
import { Button, Gap, T } from '../components/ui';
import type { LoadStyle } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color, radius } from '../theme/tokens';

/**
 * Each option draws its week: one dot per workday, placed by where that day's
 * stop is. Same stops sit on one line; different loads land all over; a mix
 * does both. Heights are how far above the line each dot sits.
 */
const STYLES: { k: LoadStyle; label: string; sub: string; week: number[]; a11y: string }[] = [
  {
    k: 'same',
    label: 'Same stops every week',
    sub: 'Set your stops up once',
    week: [0, 0, 0, 0, 0],
    a11y: 'The same stop every weekday',
  },
  {
    k: 'different',
    label: 'Different loads every day',
    sub: 'Add each load when dispatch sends it',
    week: [10, 2, 14, 6, 12],
    a11y: 'A different stop every weekday',
  },
  {
    k: 'mix',
    label: 'A mix of both',
    sub: 'Save regular stops, add the rest',
    week: [0, 9, 0, 13, 0],
    a11y: 'Some days the same stop, some days different',
  },
];

/** Figma A3 How your loads come in (new in v2), redrawn as week tiles. */
export default function HowLoadsComeIn() {
  const { s, a } = useStore();
  return (
    <Screen
      step={3}
      header={
        <OnboardingBar
          step={3}
          onBack={() => router.navigate(s.rulesCheck === 'different' || s.customCompany ? '/edit-rules' : '/company-rules')}
        />
      }
      footer={<Button label="Continue" disabled={!s.loadStyle} onPress={() => router.push('/location')} />}
    >
      <T v="h2">How do your loads come in?</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        So Docket knows your stops and appointment times before you arrive
      </T>
      <Gap h={24} />
      <View style={styles.list} accessibilityRole="radiogroup">
        {STYLES.map((o) => (
          <Tile key={o.k} {...o} selected={s.loadStyle === o.k} onPress={() => a.setLoadStyle(o.k)} />
        ))}
      </View>
    </Screen>
  );
}

function Tile({
  label,
  sub,
  week,
  a11y,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  week: number[];
  a11y: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.tileOn, pressed && styles.pressed]}
    >
      <View style={styles.week} accessibilityLabel={a11y}>
        {week.map((up, i) => (
          <View key={i} style={[styles.dot, { marginBottom: up }]} />
        ))}
        {/* The weekend: no stops. */}
        <View style={[styles.dot, selected ? styles.offOnLime : styles.off]} />
        <View style={[styles.dot, selected ? styles.offOnLime : styles.off]} />
      </View>
      <Gap h={16} />
      <T v="bodyStrong">{label}</T>
      <Gap h={4} />
      <T v="bodySmall" c={color.sub}>
        {sub}
      </T>
      {selected ? (
        <View style={styles.check}>
          <CheckIcon c={color.signal} size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

const DOT = 12;

const styles = StyleSheet.create({
  list: { gap: 8 },
  tile: {
    backgroundColor: color.raise,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: 20,
  },
  // The one lime field on the screen. The check keeps the choice clear without color.
  tileOn: { backgroundColor: color.signal },
  pressed: { transform: [{ scale: 0.98 }] },
  week: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: DOT + 14 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color.ink },
  off: { backgroundColor: color.line },
  offOnLime: { backgroundColor: 'rgba(0,0,0,0.14)' },
  check: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
