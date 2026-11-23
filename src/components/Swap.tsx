import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReduceMotion } from './stepMotion';

const native = Platform.OS !== 'web';
// A plain ease-out: the roll's sharper curve suits a digit, but on a block this size most of the
// motion landed in the first frames and read as a jump.
const EASE = Easing.out(Easing.cubic);
const DRIFT = 16;

/**
 * One thing on an open screen turning into another (the dock's big figure going from the wait to
 * the money when free time runs out): the old one drifts up and fades out while the new one rises
 * into place and fades in, over 420ms. The same motion as a rolling digit (RollText), at the size
 * of a block, so the app changes a figure one way. It plays only when `k` changes while the screen
 * is open, never on the way in, and under Reduce Motion the new one is simply there.
 * `render` draws either state from current data, so the leaving one needs no snapshot.
 */
export function Swap<K extends string>({ k, render }: { k: K; render: (k: K) => ReactNode }) {
  const reduce = useReduceMotion();
  const last = useRef(k);
  const [from, setFrom] = useState<K | null>(null);
  const [p] = useState(() => new Animated.Value(1));
  // Set up before the screen draws: after it, the new state showed whole for a frame first.
  useLayoutEffect(() => {
    if (k === last.current) return;
    const old = last.current;
    last.current = k;
    if (reduce) return;
    p.stopAnimation();
    setFrom(old);
    p.setValue(0);
    // The clock starts on the first frame after the switch has drawn: started straight away, the
    // render of the new state used up the start of the motion and it was seen already mostly done.
    let anim: Animated.CompositeAnimation | null = null;
    const raf = requestAnimationFrame(() => {
      anim = Animated.timing(p, { toValue: 1, duration: 420, easing: EASE, useNativeDriver: native });
      anim.start(({ finished }) => {
        if (finished) setFrom(null);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      anim?.stop();
    };
  }, [k, reduce, p]);
  return (
    <View>
      <Animated.View
        style={
          from
            ? {
                opacity: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.15, 1] }),
                transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [DRIFT, 0] }) }],
              }
            : null
        }
      >
        {render(k)}
      </Animated.View>
      {from ? (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.over,
            {
              opacity: p.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0, 0] }),
              transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -DRIFT] }) }],
            },
          ]}
        >
          {render(from)}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  over: { position: 'absolute', left: 0, right: 0, top: 0 },
});
