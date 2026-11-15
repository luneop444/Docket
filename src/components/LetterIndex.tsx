import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type HostInstance } from 'react-native';
import { color, fontFamily } from '../theme/tokens';

/** A–Z only: none of the companies starts with a number or symbol, so a # would jump nowhere. */
export const INDEX_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/**
 * The A–Z strip from iOS Contacts. Slide a finger along it (or tap) to jump.
 * The letters are small, so the touch area is much wider than they look, and a
 * big bubble shows the letter under your finger. VoiceOver/TalkBack treat it as
 * one adjustable control: swipe up or down to step through the letters.
 */
export function LetterIndex({ onLetter }: { onLetter: (letter: string) => void }) {
  const strip = useRef<HostInstance>(null);
  const box = useRef({ top: 0, height: 1 });
  const [active, setActive] = useState<string | null>(null);
  const [a11y, setA11y] = useState(0);

  function letterAt(pageY: number) {
    const i = Math.floor(((pageY - box.current.top) / box.current.height) * INDEX_LETTERS.length);
    return INDEX_LETTERS[Math.max(0, Math.min(INDEX_LETTERS.length - 1, i))];
  }
  function go(e: GestureResponderEvent) {
    const l = letterAt(e.nativeEvent.pageY);
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
      <View style={styles.column} pointerEvents="box-none">
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
          }}
          onResponderMove={go}
          onResponderRelease={() => setActive(null)}
          onResponderTerminate={() => setActive(null)}
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
        </View>
      </View>
      {active ? (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.bubbleText}>{active}</Text>
        </View>
      ) : null}
    </>
  );
}

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
  bubble: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 72,
    height: 72,
    borderRadius: 20, borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    fontFamily: fontFamily.semibold,
    fontSize: 36,
    color: color.bg,
  },
});
