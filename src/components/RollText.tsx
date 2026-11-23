import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useReduceMotion } from './stepMotion';

/**
 * A number that rolls when it changes, the way iOS rolls numeric text (SwiftUI's
 * .contentTransition(.numericText())): only the characters that changed move; each slides up
 * out of its slot as the new one slides up in, over 260ms with an ease-out. A ticking clock
 * then reads as counting, not flickering, and a big jump in an amount is visible as a change
 * instead of a swap. Characters line up from the right, so "9m" to "10m" rolls the ones and
 * adds the tens. Under Reduce Motion the new value just replaces the old.
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

function RollChar({ ch, style }: { ch: string; style?: StyleProp<TextStyle> }) {
  const reduce = useReduceMotion();
  const prev = useRef(ch);
  const [from, setFrom] = useState<string | null>(null);
  const [h, setH] = useState(0);
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (ch === prev.current) return;
    const old = prev.current;
    prev.current = ch;
    if (reduce || !h || !/\d/.test(ch + old)) return;
    setFrom(old);
    y.setValue(0);
    Animated.timing(y, { toValue: -h, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(({ finished }) => {
      if (finished) {
        setFrom(null);
        y.setValue(0);
      }
    });
  }, [ch, h, reduce, y]);
  return (
    <View style={styles.slot} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {/* Sized by the current character; the rolling column sits over it. */}
      <Text style={[style, from ? styles.hidden : null]} importantForAccessibility="no">
        {ch}
      </Text>
      {from ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: y }] }]} importantForAccessibility="no-hide-descendants">
          <Text style={style}>{from}</Text>
          <Text style={style}>{ch}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  slot: { overflow: 'hidden' },
  hidden: { opacity: 0 },
});
