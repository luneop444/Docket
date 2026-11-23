import { useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '../theme/tokens';
import { useReduceMotion } from './stepMotion';

/**
 * How the surface shows it was pressed, in the design system's lime (`signal`):
 * - wash: the whole surface turns lime under the finger, corners and all. On a dark surface
 *   pass children as a function and flip the content to ink while `lit` (see Button);
 * - ring: a lime ring inside the edge (only where content can't flip, e.g. the picked segment);
 * - dim: a light ink veil (surfaces that are already lime);
 * - none: no highlight, only the give.
 */
export type PressHighlight = 'wash' | 'ring' | 'dim' | 'none';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The lime stays up at least this long before the press acts. A quick tap is over in under
 * 100ms and most taps open another screen, so without this the lime was gone (with the screen)
 * before anyone saw it. 150ms reads as an instant response but is long enough to see.
 */
export const MIN_LIT_MS = 150;
const native = Platform.OS !== 'web';

/**
 * Touch feedback for anything you tap, made for fingers, not a mouse:
 * - the surface eases down (0.97) as the finger lands, fast so it feels attached;
 * - it springs back on lift with a small settle, like iOS controls;
 * - a 50ms press delay, so starting to scroll a list doesn't make every card flinch
 *   (a real tap is longer than that; a scroll cancels first);
 * - the lime highlight (see PressHighlight) shows at once, so even a quick tap is seen,
 *   then fades out after the finger lifts;
 * - Reduce Motion: no scaling; the highlight still shows.
 * There is no hover state: on a phone there's nothing to hover with.
 */
export function Tappable({
  style,
  give = 0.97,
  highlight = 'wash',
  children,
  onPressIn,
  onPressOut,
  onPress,
  instant = false,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  /** Act on the press right away (steppers that repeat), not after MIN_LIT_MS. */
  instant?: boolean;
  style?: StyleProp<ViewStyle> | ((s: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** How far it gives: 0.97 for buttons and rows, closer to 1 for big cards. */
  give?: number;
  /** Lime press highlight: wash (default), ring, dim or none. */
  highlight?: PressHighlight;
  /** Content, or a function of `lit` (true while the highlight shows) to recolor it on lime. */
  children?: ReactNode | ((s: { lit: boolean }) => ReactNode);
}) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [lit] = useState(() => new Animated.Value(0));
  // True from press until the fade finishes, so content recolored for lime never sits on the
  // dark surface (or white on lime) mid-fade.
  const [isLit, setIsLit] = useState(false);
  const litAt = useRef(0);

  const light = () => {
    lit.stopAnimation();
    lit.setValue(1);
    setIsLit(true);
    litAt.current = Date.now();
  };
  const unlight = () => {
    Animated.timing(lit, { toValue: 0, duration: 260, delay: 60, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(
      ({ finished }) => finished && setIsLit(false),
    );
  };
  const down = () => {
    if (reduce) return;
    v.stopAnimation();
    Animated.timing(v, { toValue: give, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  };
  const up = () => {
    if (reduce) return;
    Animated.spring(v, { toValue: 1, speed: 28, bounciness: 7, useNativeDriver: native }).start();
  };

  const base = typeof style === 'function' ? style({ pressed }) : style;
  // The highlight follows the surface's own corner, so it never pokes past the squircle.
  const flat = StyleSheet.flatten(base) ?? {};
  const corner = {
    borderRadius: flat.borderRadius,
    borderTopLeftRadius: flat.borderTopLeftRadius,
    borderTopRightRadius: flat.borderTopRightRadius,
    borderBottomLeftRadius: flat.borderBottomLeftRadius,
    borderBottomRightRadius: flat.borderBottomRightRadius,
    borderCurve: 'continuous' as const,
  };
  return (
    <AnimatedPressable
      unstable_pressDelay={50}
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        light();
        down();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        unlight();
        up();
        onPressOut?.(e);
      }}
      onPress={
        onPress &&
        ((e) => {
          // Let the lime be seen first (MIN_LIT_MS), then act. A long press acts at once.
          const wait = MIN_LIT_MS - (Date.now() - litAt.current);
          if (instant || wait <= 0 || highlight === 'none') onPress(e);
          else setTimeout(() => onPress(e), wait);
        })
      }
      // Always a transform (scale 1 under Reduce Motion): it makes the surface its own stacking
      // context, so the highlight at zIndex -1 sits above the surface's fill but under every child
      // (on the web an absolute layer would otherwise paint over unpositioned children like icons).
      // While the finger is down the surface itself is lime too, so no dark hairline of an ink
      // fill shows round the highlight's anti-aliased edge.
      style={[base, pressed && highlight === 'wash' && hl.wash, { transform: [{ scale: v }] }]}
    >
      {highlight !== 'none' && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, corner, hl[highlight], { zIndex: -1, opacity: lit }]} />
      )}
      {typeof children === 'function' ? children({ lit: isLit }) : children}
    </AnimatedPressable>
  );
}

const hl = StyleSheet.create({
  wash: { backgroundColor: color.signal },
  ring: { borderWidth: 3, borderColor: color.signal },
  dim: { backgroundColor: 'rgba(28,28,28,0.12)' },
});
