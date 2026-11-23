import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from './stepMotion';

/**
 * Something new arriving on a screen that's already open (the lime "Detention so far" card the
 * moment free time runs out): it fades in and rises 12pt into place over 320ms, ease-out, so
 * the change is noticed instead of the layout just jumping. Not for whole screens.
 * Under Reduce Motion it's simply there.
 */
export function Appear({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return;
    Animated.timing(t, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reduce, t]);
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}
