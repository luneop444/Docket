import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { clockBare } from '../logic/format';
import { useStore } from '../state/AppStore';
import { color, device, fontFamily, protoColor } from '../theme/tokens';
import { FrameContext } from './Chrome';
import { Battery, SignalBars } from './Icons';

/** At this window width and up we're on a computer: draw the phone frame. */
const DESKTOP_MIN_WIDTH = 761;
const ASIDE_WIDTH = 300;
const GAP = 40;

/**
 * On desktop web, shows the app inside an iPhone frame with notes beside it,
 * like the v1 prototype. On phones (web or native) it fills the screen.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;

  if (!framed) {
    return (
      <FrameContext.Provider value={false}>
        <View style={styles.fill}>{children}</View>
      </FrameContext.Provider>
    );
  }

  // Shrink to fit short or narrow laptop screens, keeping the iPhone shape.
  const showAside = width >= device.width + GAP + ASIDE_WIDTH + 64;
  const contentW = device.width + 22 + (showAside ? GAP + ASIDE_WIDTH : 0);
  const scale = Math.min(1, (height - 48) / (device.height + 22), (width - 32) / contentW);

  return (
    <FrameContext.Provider value={true}>
      <View style={styles.desk}>
        <View style={[styles.stage, { transform: [{ scale }] }]}>
          <View style={styles.phone}>
            {children}
            <StatusBarFake />
          </View>
          {showAside ? <Aside /> : null}
        </View>
      </View>
    </FrameContext.Provider>
  );
}

function StatusBarFake() {
  const { s } = useStore();
  return (
    <View style={styles.statusbar} pointerEvents="none">
      <Text style={styles.sbTime}>{clockBare(s.now)}</Text>
      <View style={styles.sbInd}>
        <SignalBars />
        <Battery />
      </View>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((t) => (
        <View key={t} style={styles.li}>
          <Text style={styles.asideText}>•</Text>
          <Text style={[styles.asideText, { flex: 1 }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function Aside() {
  const { a } = useStore();
  return (
    <View style={styles.aside}>
      <Text style={styles.asideH2}>Docket · Prototype v1</Text>
      <Text style={styles.asideText}>
        Open on a phone for the real experience. On a computer, use it inside this frame.
      </Text>
      <Text style={styles.asideH3}>Try this</Text>
      <Bullets
        items={[
          'Set up your company’s rules',
          'Pull into Harbor Foods and watch free time run out',
          'Leave, snap a BOL, check the stop',
          'Mark last week’s settlement and message your fleet manager',
        ]}
      />
      <View style={styles.h3Row}>
        <Text style={[styles.asideH3, { marginTop: 0 }]}>Faked for now</Text>
        <Text style={styles.mark}> LABELED IN APP </Text>
      </View>
      <Bullets
        items={[
          'GPS arriving and leaving (buttons)',
          'Time runs 60× faster',
          'Reading the BOL and settlement (sample results)',
          'Company list and wait data (made-up)',
          'The Dynamic Island / lock screen Live Activity is drawn by the page, not iOS',
        ]}
      />
      <Text style={styles.asideH3}>Real</Text>
      <Bullets
        items={[
          'Rules you enter drive every number',
          'Camera for the BOL photo',
          'The message opens your own text app with the claim filled in',
        ]}
      />
      <Pressable accessibilityRole="button" onPress={a.resetAll} style={{ marginTop: 14 }}>
        <Text style={[styles.asideText, styles.reset]}>Reset prototype</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: protoColor.desk },
  stage: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  phone: {
    width: device.width,
    height: device.height,
    borderRadius: 54,
    overflow: 'hidden',
    backgroundColor: color.bg,
    boxShadow: `0 0 0 10px ${protoColor.bezel}, 0 0 0 11px ${protoColor.bezelEdge}, 0 30px 80px ${protoColor.frameShadow}`,
  },
  statusbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingLeft: 40,
    paddingRight: 32,
    zIndex: 30,
  },
  sbTime: { fontFamily: fontFamily.semibold, fontSize: 16, color: color.ink },
  sbInd: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  aside: { width: ASIDE_WIDTH },
  asideH2: { fontFamily: fontFamily.semibold, fontSize: 17, color: color.ink, marginBottom: 8 },
  asideH3: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    letterSpacing: 0.52,
    textTransform: 'uppercase',
    color: color.sub,
    marginTop: 14,
    marginBottom: 4,
  },
  h3Row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, marginBottom: 4 },
  mark: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: color.ink,
    backgroundColor: color.signal,
    borderRadius: 4,
    overflow: 'hidden',
  },
  asideText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: protoColor.asideInk },
  list: { paddingLeft: 4 },
  li: { flexDirection: 'row', gap: 8 },
  reset: { textDecorationLine: 'underline', color: color.sub },
});
