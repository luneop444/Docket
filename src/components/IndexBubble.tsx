import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { color, fontFamily } from '../theme/tokens';

export const BUBBLE = 56;

/**
 * The A–Z bubble in liquid glass, like the tab bar: Apple's real glass on iOS 26
 * (expo-glass-effect), the same translucent white elsewhere.
 */
export function IndexBubble({ letter }: { letter: string; active: boolean; warm: boolean }) {
  const native = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const Shell = native ? GlassView : View;
  return (
    <Shell style={[styles.bubble, native ? null : styles.frosted]} {...(native ? { glassEffectStyle: 'regular' as const } : {})}>
      <Text style={styles.letter}>{letter}</Text>
    </Shell>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frosted: { backgroundColor: 'rgba(255,255,255,0.52)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.10)' },
  letter: { fontFamily: fontFamily.semibold, fontSize: 28, color: color.ink },
});
