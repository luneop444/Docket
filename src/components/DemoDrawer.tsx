import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DEMO_STATES, type DemoState } from '../logic/demo';
import { placeOf } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color, protoColor, radius } from '../theme/tokens';
import { Button, Gap, T } from './ui';

const STATE_LABEL: Record<DemoState, string> = {
  driving: 'Driving',
  asking: 'Asking',
  counting: 'Free time',
  paid: 'Paid time',
  left: 'Just left',
  logged: 'Logged',
};

/**
 * Prototype only. Stands in for GPS and time passing, so a demo can show each
 * Home state happening the way the real app gets there. Folded away as a small
 * tab so it stays out of the design and out of screenshots.
 */
export function DemoDrawer() {
  const { s, a } = useStore();
  const [open, setOpen] = useState(false);
  const phase = s.stop.phase;
  const place = placeOf(s.load).short;
  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  if (!open) {
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

  return (
    <View style={styles.wrap} pointerEvents="box-none">
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
    position: 'absolute',
    right: 16,
    bottom: 16,
    height: 36,
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
    backgroundColor: color.raise,
  },
});
