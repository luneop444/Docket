import { Stack } from 'expo-router/js-stack';
import { View } from 'react-native';
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
    // Clipped: the stack parks the page underneath a screen's height below once it's covered,
    // and unclipped that made the whole document two screens tall, so a scroll anywhere moved
    // the page out from under the app (the scanned statement rode up off the top, 24 Nov).
    <View style={{ flex: 1, overflow: 'hidden' }}>
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: reduce || NO_PUSH.has(route.name) ? 'none' : 'slide_from_right',
        gestureEnabled: false,
        cardStyle: { backgroundColor: color.canvas },
      })}
    />
    </View>
  );
}
