import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useReduceMotion } from './stepMotion';

/**
 * A number that rolls when it changes, the way iOS rolls numeric text (SwiftUI's
 * .contentTransition(.numericText())): only the characters that changed move. The old one drifts
 * up a third of its height and fades out while the new one rises into place and fades in, over
 * 380ms on a smooth ease-out, with nothing clipped. A hard mask at the glyph's edge is what made
 * big figures look like they jerked: the eye catches the digit being sliced, not the motion.
 * Characters line up from the right, so "9m" to "10m" rolls the ones and adds the tens. Under
 * Reduce Motion the new value just replaces the old.
 * Use tabular figures in `style` so a rolling digit doesn't shift its neighbours.
 */
export function RollText({ text, style, label }: { text: string; style?: StyleProp<TextStyle>; label?: string }) {
  const chars = text.split('');
  return (
    <View accessible accessibilityLabel={label ?? text} style={styles.row}>
      {chars.map((ch, i) => (
        <RollChar key={chars.length - i} ch={ch} style={style} />
      ))}
    </View>
  );
}

const native = Platform.OS !== 'web';
const DRIFT = 0.34; // of the line height
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

function RollChar({ ch, style }: { ch: string; style?: StyleProp<TextStyle> }) {
  const reduce = useReduceMotion();
  const prev = useRef(ch);
  const [from, setFrom] = useState<string | null>(null);
  const [h, setH] = useState(0);
  const [p] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (ch === prev.current) return;
    const old = prev.current;
    prev.current = ch;
    if (reduce || !h || !/\d/.test(ch + old)) return;
    p.stopAnimation();
    setFrom(old);
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 380, easing: EASE, useNativeDriver: native }).start(({ finished }) => {
      if (finished) setFrom(null);
    });
  }, [ch, h, reduce, p]);
  const d = h * DRIFT;
  return (
    <View onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {/* The new character is in flow, so it sizes the slot; the old one sits over it. */}
      <Animated.Text
        importantForAccessibility="no"
        style={[
          style,
          from
            ? {
                opacity: p.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.2, 1] }),
                transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
              }
            : null,
        ]}>
        {ch}
      </Animated.Text>
      {from ? (
        <Animated.Text
          importantForAccessibility="no"
          style={[
            style,
            styles.over,
            {
              opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 0] }),
              transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -d] }) }],
            },
          ]}>
          {from}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  over: { position: 'absolute', left: 0, right: 0, top: 0 },
});
