import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type GestureResponderEvent, type HostInstance } from 'react-native';
import { useReduceMotion } from './stepMotion';
import { color, fontFamily } from '../theme/tokens';

/** A–Z only: none of the companies starts with a number or symbol, so a # would jump nowhere. */
export const INDEX_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/**
 * The A–Z strip from iOS Contacts. Slide a finger along it (or tap) to jump.
 * The letters are small, so the touch area is much wider than they look, and a
 * bubble beside your thumb shows the letter under it. VoiceOver/TalkBack treat it as
 * one adjustable control: swipe up or down to step through the letters.
 */
export function LetterIndex({ onLetter, visible }: { onLetter: (letter: string) => void; visible: boolean }) {
  // Fades and slides in from the edge when the A–Z list reaches the screen, and back out.
  const reduce = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(visible ? 1 : 0));
  useEffect(() => {
    Animated.timing(shown, {
      toValue: visible ? 1 : 0,
      duration: reduce ? 0 : visible ? 200 : 150,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, reduce, shown]);

  const strip = useRef<HostInstance>(null);
  const box = useRef({ top: 0, height: 1 });
  const [active, setActive] = useState<string | null>(null);
  // The bubble beside your thumb: its letter, its height on the strip, and its fade.
  const [bubble, setBubble] = useState({ letter: '', y: 0 });
  const [bubbleOn] = useState(() => new Animated.Value(0));
  function showBubble(on: boolean) {
    bubbleOn.stopAnimation();
    Animated.timing(bubbleOn, {
      toValue: on ? 1 : 0,
      duration: reduce ? 0 : on ? 120 : 200,
      // After you lift, it stays half a second so you can see where you landed.
      delay: on ? 0 : 500,
      easing: on ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }
  const [a11y, setA11y] = useState(0);

  function letterAt(pageY: number) {
    const i = Math.floor(((pageY - box.current.top) / box.current.height) * INDEX_LETTERS.length);
    return INDEX_LETTERS[Math.max(0, Math.min(INDEX_LETTERS.length - 1, i))];
  }
  function go(e: GestureResponderEvent) {
    const { pageY } = e.nativeEvent;
    const l = letterAt(pageY);
    const y = Math.max(0, Math.min(box.current.height, pageY - box.current.top));
    setBubble({ letter: l, y });
    if (l !== active) {
      setActive(l);
      onLetter(l);
    }
  }
  function step(dir: 1 | -1) {
    const i = Math.max(0, Math.min(INDEX_LETTERS.length - 1, a11y + dir));
    setA11y(i);
    onLetter(INDEX_LETTERS[i]);
  }

  return (
    <>
      <Animated.View
        style={[
          styles.column,
          { opacity: shown, transform: [{ translateX: shown.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
        ]}
        pointerEvents={visible ? 'box-none' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      >
        <View
          ref={strip}
          style={styles.hit}
          onLayout={() =>
            strip.current?.measureInWindow((_x, y, _w, h) => {
              box.current = { top: y, height: h || 1 };
            })
          }
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            // Re-measure in case the page scrolled or the frame moved.
            strip.current?.measureInWindow((_x, y, _w, h) => {
              box.current = { top: y, height: h || 1 };
            });
            go(e);
            showBubble(true);
          }}
          onResponderMove={go}
          onResponderRelease={() => {
            setActive(null);
            showBubble(false);
          }}
          onResponderTerminate={() => {
            setActive(null);
            showBubble(false);
          }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Jump to letter"
          accessibilityValue={{ text: INDEX_LETTERS[a11y] }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          {INDEX_LETTERS.map((l) => (
            <Text key={l} style={[styles.letter, l === active && styles.letterOn]}>
              {l}
            </Text>
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                top: bubble.y - BUBBLE / 2,
                opacity: bubbleOn,
                transform: [{ scale: bubbleOn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <Text style={styles.bubbleText}>{bubble.letter}</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );
}

const BUBBLE = 56;

const styles = StyleSheet.create({
  // Centered and compact like iOS Contacts, so it never runs into the rounded screen corners.
  column: {
    position: 'absolute',
    right: 0,
    top: 12,
    bottom: 12,
    justifyContent: 'center',
  },
  hit: {
    // A drag along the letters must never turn into a text selection.
    userSelect: 'none',
    width: 32,
    alignItems: 'flex-end',
    paddingRight: 4,
    paddingVertical: 6,
  },
  letter: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 15,
    color: color.ink,
    width: 16,
    textAlign: 'center',
  },
  letterOn: { color: color.sub },
  // Just left of the thumb, clear of it, following it up and down.
  bubble: {
    position: 'absolute',
    right: 48,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    color: color.bg,
  },
});
