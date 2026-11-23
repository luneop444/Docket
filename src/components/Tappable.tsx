import { useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from './stepMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const native = Platform.OS !== 'web';

/**
 * Touch feedback for anything you tap, made for fingers, not a mouse:
 * - the surface eases down (0.97) as the finger lands, fast so it feels attached;
 * - it springs back on lift with a small settle, like iOS controls;
 * - a 50ms press delay, so starting to scroll a list doesn't make every card flinch
 *   (a real tap is longer than that; a scroll cancels first);
 * - Reduce Motion: no scaling, the surface dims a little instead.
 * There is no hover state: on a phone there's nothing to hover with.
 */
export function Tappable({
  style,
  give = 0.97,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((s: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** How far it gives: 0.97 for buttons and rows, closer to 1 for big cards. */
  give?: number;
  children?: ReactNode;
}) {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);

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
  return (
    <AnimatedPressable
      unstable_pressDelay={50}
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        down();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        up();
        onPressOut?.(e);
      }}
      style={[base, reduce ? pressed && { opacity: 0.7 } : { transform: [{ scale: v }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
