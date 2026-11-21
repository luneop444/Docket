import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics, the way Apple's HIG ("Playing haptics") assigns them, so a tap only buzzes when
 * iOS itself would:
 * - selection: a value changes in a set of choices (a picked answer, a segment, a switch,
 *   a stepper step, each letter on the A–Z index);
 * - success: a task the driver started has finished (clock started, checked in, stop logged,
 *   time fixed, message copied);
 * - warning: something now needs attention (detention has started).
 * Plain buttons and navigation get none, as in iOS. The web build has no haptics (Safari has
 * no vibration), so these do nothing there.
 */
const on = Platform.OS === 'ios' || Platform.OS === 'android';

export function tick() {
  if (on) void Haptics.selectionAsync().catch(() => {});
}

export function done() {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function heads() {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
