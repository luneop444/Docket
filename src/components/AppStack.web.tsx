import { Stack } from 'expo-router/js-stack';
import { color } from '../theme/tokens';
import { NO_PUSH } from './pushRoutes';
import { useReduceMotion } from './stepMotion';

/**
 * Web: the JavaScript stack, so a button that opens another page pushes it like iOS does: the
 * new page slides in from the right over the old one, which eases a third of the way left and
 * dims, and Back plays it in reverse. The native-style stack on the web can't animate, which
 * left every page change a hard cut (24 Nov). No swipe-back: there's no edge to swipe from
 * with a mouse or touchpad, and a drag on the page should scroll it.
 */
export function AppStack() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: reduce || NO_PUSH.has(route.name) ? 'none' : 'slide_from_right',
        gestureEnabled: false,
        cardStyle: { backgroundColor: color.canvas },
      })}
    />
  );
}
