import { Stack } from 'expo-router';
import { color } from '../theme/tokens';
import { NO_PUSH } from './pushRoutes';
import { useReduceMotion } from './stepMotion';

/**
 * iOS: the native stack's own push (slide in from the right, the page under it eases left).
 * Onboarding, the tabs and the launch route keep their own motion (stepMotion) or none.
 */
export function AppStack() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: reduce || NO_PUSH.has(route.name) ? 'none' : 'default',
        contentStyle: { backgroundColor: color.canvas },
      })}
    />
  );
}
