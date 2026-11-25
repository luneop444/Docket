import { useRef, type ComponentRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { clockBare } from '../logic/format';
import { useStore } from '../state/AppStore';
import { color, device, fontFamily, protoColor } from '../theme/tokens';
import { FrameContext } from './Chrome';
import { Battery, SignalBars } from './Icons';
import { useWheelToPhone } from './wheelToPhone';

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
  const phone = useRef<ComponentRef<typeof View>>(null);
  useWheelToPhone(phone, framed);

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
          <View ref={phone} style={styles.phone}>
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
      <Text style={styles.asideH2}>Docket · Beta</Text>
      <Text style={styles.asideText}>
        Open on a phone for the real experience. On a computer, use it inside this frame.
      </Text>
      <Text style={styles.asideH3}>Try this</Text>
      <Bullets
        items={[
          'Set up: your name, your company and its detention rules',
          'Add today’s load from a rate con screenshot or PDF, or type it in',
          'At the stop, tap “I’m here”, then “I left”',
          'Send the claim, then scan your settlement when it comes',
        ]}
      />
      <Text style={styles.asideH3}>Works differently on the web</Text>
      <Bullets
        items={[
          'Location only while Docket is open (the iPhone app watches with it closed)',
          'The Dynamic Island and lock screen are drawn by the page (the iPhone app uses a real Live Activity)',
        ]}
      />
      <Text style={styles.asideH3}>Everything else is real</Text>
      <Bullets
        items={[
          'No sample data: every number comes from your rules and the stops you time',
          'Claude reads your rate con, your BOL times and your settlement. Files aren’t kept',
          'Your stops: a record you can copy as text or download as a CSV',
          'The claim message opens your own text app, filled in',
        ]}
      />
      <Pressable accessibilityRole="button" onPress={a.resetAll} style={{ marginTop: 14 }}>
        <Text style={[styles.asideText, styles.reset]}>Start over (clears everything on this device)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.canvas },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: protoColor.desk },
  stage: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  phone: {
    width: device.width,
    height: device.height,
    borderRadius: 54, borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: color.canvas,
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
    borderRadius: 4, borderCurve: 'continuous',
    overflow: 'hidden',
  },
  asideText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: protoColor.asideInk },
  list: { paddingLeft: 4 },
  li: { flexDirection: 'row', gap: 8 },
  reset: { textDecorationLine: 'underline', color: color.sub },
});
