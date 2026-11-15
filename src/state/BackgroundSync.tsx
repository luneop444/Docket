/**
 * Keeps the phone's background work in step with the app: fences around saved
 * facilities, reminders for the stop, crossings that happened while Docket was
 * closed, and taps on Docket's notifications. Renders nothing; no-op on the web.
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import { planFence } from '../logic/background';
import { useStore } from './AppStore';
import { contextOf, NATIVE, onFenceRecord, syncFences, syncReminders, takeFenceRecords } from './background';

export function BackgroundSync() {
  const { s, a } = useStore();
  const latest = useRef({ s, a });
  useEffect(() => {
    latest.current = { s, a };
  });

  // Fences follow the saved places, the load, and the location setting.
  useEffect(() => {
    void syncFences(latest.current.s);
  }, [s.placeCoords, s.load, s.location, s.onboarded]);

  // Reminders follow the stop's times and the rules.
  const st = s.stop;
  useEffect(() => {
    void syncReminders(latest.current.s);
  }, [st.phase, st.live, st.arrive, st.appt, st.dayStart, s.rules]);

  // Apply crossings saved by the background task: on open, on coming back, and live.
  useEffect(() => {
    if (!NATIVE) return;
    let busy = false;
    const drain = async () => {
      if (busy) return;
      busy = true;
      try {
        const records = await takeFenceRecords();
        const { s: now, a: act } = latest.current;
        for (const step of planFence(contextOf(now), records)) {
          if (step.action === 'arrive') act.arriveNow(true, step.at);
          else act.askLeft(step.at);
        }
      } finally {
        busy = false;
      }
    };
    void drain();
    const app = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') void drain();
    });
    const off = onFenceRecord(() => void drain());
    return () => {
      app.remove();
      off();
    };
  }, []);

  // Tapping a Docket notification opens Today.
  useEffect(() => {
    if (!NATIVE) return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (url === '/today') router.navigate('/today');
    });
    return () => sub.remove();
  }, []);

  return null;
}
