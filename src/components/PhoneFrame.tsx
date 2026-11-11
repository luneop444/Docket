import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { color, device } from '../theme/tokens';

/** Below this window width we assume a real phone and fill the screen. */
const DESKTOP_MIN_WIDTH = 600;
const BEZEL = 12;

/**
 * On desktop web, shows the app inside an iPhone-sized frame so the demo looks
 * like the Figma screens. On phones (web or native) it renders children as-is.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;

  if (!framed) return <View style={styles.fill}>{children}</View>;

  // Shrink to fit short laptop screens while keeping the iPhone aspect ratio.
  const outerH = device.height + BEZEL * 2;
  const scale = Math.min(1, (height - 32) / outerH);

  return (
    <View style={styles.desk}>
      <View style={[styles.bezel, { transform: [{ scale }] }]}>
        <View style={styles.screen}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  desk: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.raise2,
  },
  bezel: {
    padding: BEZEL,
    borderRadius: 60,
    backgroundColor: color.ink,
  },
  screen: {
    width: device.width,
    height: device.height,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: color.bg,
  },
});
