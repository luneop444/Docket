/**
 * Background location and reminders (iPhone and Android builds only; the web
 * and Expo Go can't do this).
 *
 * iOS watches a fence around each facility Docket knows and wakes this task
 * when the driver crosses one, even with Docket closed. The task never edits
 * the app's state (the open app could overwrite it). It saves the crossing
 * with its time and shows a notification; the app applies it when it opens,
 * at the original time, so the clock is still exact.
 *
 * Imported at the top of the root layout so the task exists before anything runs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import {
  fenceAction,
  fenceNotice,
  fenceRegions,
  REMINDER_IDS,
  stopReminders,
  type FenceContext,
  type FenceRecord,
} from '../logic/background';
import { parseState, placeOf, STORAGE_KEY, type AppState } from '../logic/state';

export const FENCE_TASK = 'docket-fences';
const QUEUE_KEY = 'docket-fences-v1';
/** True on a phone build. Background location and notifications don't exist on the web. */
export const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

export function contextOf(s: AppState): FenceContext {
  return { watched: s.load ? placeOf(s.load).name : null, phase: s.stop.phase, live: !!s.stop.live };
}

/** Crossings waiting for the app, oldest first. */
export async function takeFenceRecords(): Promise<FenceRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(QUEUE_KEY);
    const list = JSON.parse(raw) as FenceRecord[];
    return Array.isArray(list) ? list.sort((a, b) => a.at - b.at) : [];
  } catch {
    return [];
  }
}

/** Listeners in the open app, so a crossing while it's running applies right away. */
const listeners = new Set<() => void>();
export function onFenceRecord(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(
    FENCE_TASK,
    async ({ data, error }) => {
      if (error || !data?.region?.identifier) return;
      const record: FenceRecord = {
        type: data.eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit',
        place: data.region.identifier,
        at: Date.now(),
      };
      try {
        const s = parseState(await AsyncStorage.getItem(STORAGE_KEY));
        const action = fenceAction(contextOf(s), record);
        if (!action) return;
        const queue = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]') as FenceRecord[];
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, record].slice(-20)));
        listeners.forEach((fn) => fn());
        const { title, body } = fenceNotice(action, placeOf(s.load).short, record.at);
        await Notifications.scheduleNotificationAsync({ content: { title, body, data: { url: '/today' } }, trigger: null });
      } catch {
        // Nothing to do from here; the foreground watcher still works when the app opens.
      }
    },
  );
}

/** Ask for "Always" location after "While using" was granted. iOS shows its own upgrade prompt. */
export async function askBackground(): Promise<boolean> {
  if (!NATIVE) return false;
  try {
    const { granted } = await Location.requestBackgroundPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/** Ask once for notifications (on a tap, alongside location). */
export async function askNotifications(): Promise<boolean> {
  if (!NATIVE) return false;
  try {
    const now = await Notifications.getPermissionsAsync();
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Fence every saved facility while location is on and there's a load; stop otherwise. */
export async function syncFences(s: AppState): Promise<void> {
  if (!NATIVE) return;
  try {
    const regions = fenceRegions(s.placeCoords, s.load ? placeOf(s.load).name : null);
    const bg = await Location.getBackgroundPermissionsAsync();
    const on = s.onboarded && s.location === 'always' && !!s.load && regions.length > 0 && bg.granted;
    const running = await Location.hasStartedGeofencingAsync(FENCE_TASK).catch(() => false);
    if (on) await Location.startGeofencingAsync(FENCE_TASK, regions);
    else if (running) await Location.stopGeofencingAsync(FENCE_TASK);
  } catch {
    // Background location unavailable: the foreground watcher and buttons still work.
  }
}

/** Schedule (or clear) "free time ends soon" and "detention started" for the stop. */
export async function syncReminders(s: AppState): Promise<void> {
  if (!NATIVE) return;
  try {
    await Promise.all(REMINDER_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    const list = stopReminders(s.stop, s.rules, placeOf(s.load).short, Date.now());
    if (!list.length || !(await Notifications.getPermissionsAsync()).granted) return;
    for (const r of list) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { url: '/today' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at) },
      });
    }
  } catch {
    // Reminders are a nicety; the stop is still timed.
  }
}
