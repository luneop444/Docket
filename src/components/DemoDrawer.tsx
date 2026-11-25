import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DEMO_STATES, demoLoad, type DemoState } from '../logic/demo';
import { placeOf } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color, glass, protoColor, radius } from '../theme/tokens';
import { useTabSpace } from './Chrome';
import { Button, Gap, T } from './ui';

const STATE_LABEL: Record<DemoState, string> = {
  driving: 'Driving',
  asking: 'Asking',
  counting: 'Free time',
  paid: 'Paid time',
  left: 'Just left',
  logged: 'Logged',
};

// Open or not, shared by the tab in the header and the drawer over the screen.
let openNow = false;
const subs = new Set<() => void>();
const setOpen = (v: boolean) => {
  openNow = v;
  subs.forEach((f) => f());
};
const useOpen = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => openNow,
    () => false,
  );

/**
 * Prototype only: the small dashed "Demo" tab that opens the controls. It sits in Today's header,
 * in the page's flow: floating over the screen it covered whatever text scrolled under it (24 Nov).
 */
export function DemoTab() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open demo controls"
      onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <T v="labelPill" c={protoColor.fakeInk}>
        Demo
      </T>
    </Pressable>
  );
}

/**
 * Prototype only. Stands in for GPS and time passing, so a demo can show each
 * Home state happening the way the real app gets there. Opened from DemoTab.
 */
export function DemoDrawer() {
  const { s, a } = useStore();
  const open = useOpen();
  // Clear of the floating tab bar, which would otherwise cover the panel's last row.
  const { space } = useTabSpace();
  const phase = s.stop.phase;
  // With no load yet, a demo stop runs on the sample load, so the buttons name its stop.
  const place = placeOf(demoLoad(s)).short;
  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: space - 12 }]} pointerEvents="box-none">
      <Pressable accessibilityLabel="Close demo controls" style={styles.scrim} onPress={() => setOpen(false)} />
      <View style={styles.panel}>
        <View style={styles.head}>
          <T v="labelSmall">Demo controls</T>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={12}>
            <T v="labelSmall" c={color.sub}>
              Close
            </T>
          </Pressable>
        </View>
        <Gap h={4} />
        <T v="bodyTiny">These stand in for GPS and time passing.</T>
        <Gap h={16} />
        <View style={styles.list}>
          {phase === 'idle' ? (
            <>
              <Button label={`Park at ${place}, a new place`} variant="quiet" small onPress={run(() => a.pullIn(false))} />
              <Button label={`Pull into ${place}, a known stop`} variant="quiet" small onPress={run(() => a.pullIn(true))} />
            </>
          ) : null}
          {phase === 'dock' ? (
            <>
              <Button label="Skip ahead 30 min" variant="quiet" small onPress={() => a.skip(30)} />
              <Button label="Leave the facility" variant="quiet" small onPress={run(() => a.leave())} />
              {s.stop.checkin == null ? (
                <Button label="Say “Hey Siri, I checked in”" variant="quiet" small onPress={run(a.siriCheckIn)} />
              ) : null}
            </>
          ) : null}
          {phase === 'dock' || phase === 'arriving' || phase === 'left' ? (
            <Button label="Lock the phone" variant="quiet" small onPress={run(() => a.setLock(true))} />
          ) : null}
          <Button label="Back to driving" variant="text" small onPress={run(() => a.demo('driving'))} />
        </View>
        <Gap h={16} />
        <T v="bodyTiny">Jump to</T>
        <Gap h={8} />
        <View style={styles.chips}>
          {DEMO_STATES.map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              onPress={run(() => a.demo(k))}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <T v="labelPill">{STATE_LABEL[k]}</T>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    height: 32,
    marginRight: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    justifyContent: 'center',
    backgroundColor: protoColor.fakeBg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: protoColor.dashed,
  },
  pressed: { opacity: 0.7 },
  wrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: protoColor.scrim },
  panel: {
    margin: 12,
    padding: 20,
    backgroundColor: color.bg,
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: protoColor.dashed,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    justifyContent: 'center',
    ...glass,
  },
});
