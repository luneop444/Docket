/**
 * Real location, while the app is open (the web and Expo Go can't track in the
 * background). The first "I'm here" at a facility saves where it is; after
 * that Docket starts the clock on its own when you pull in, and asks when
 * location sees you drive away.
 */
import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { fenceEvent, MAX_ACCURACY_M, type LatLon } from '../logic/geo';
import { placeOf } from '../logic/state';
import { useStore } from './AppStore';

type Actions = ReturnType<typeof useStore>['a'];

/** Ask for location (on a tap, so the browser shows its prompt) and save where this facility is. */
export async function rememberSpot(a: Actions, name: string): Promise<void> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      a.toast('Location is off. Docket will keep timing stops by hand.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const acc = pos.coords.accuracy;
    if (acc != null && acc > MAX_ACCURACY_M) return;
    a.savePlace(name, { lat: pos.coords.latitude, lon: pos.coords.longitude });
  } catch {
    // No GPS fix (indoors, desktop without location): nothing saved, timing still works.
  }
}

/** Watches location while there's a stop to notice. Renders nothing. */
export function LocationWatcher() {
  const { s, a } = useStore();
  const place = placeOf(s.load);
  const spot: LatLon | undefined = s.placeCoords[place.name];
  const atStop = s.stop.phase === 'dock' && !!s.stop.live;
  const waiting = s.stop.phase === 'idle';
  const on = s.onboarded && s.location === 'always' && !!s.load && !!spot && (waiting || atStop);

  // The callback reads the latest values without restarting the watch.
  const latest = useRef({ a, spot, atStop });
  useEffect(() => {
    latest.current = { a, spot, atStop };
  });

  useEffect(() => {
    if (!on) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        // Don't prompt here: the prompt comes from a tap on "I'm here".
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted || cancelled) return;
        const s2 = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 25 },
          (pos) => {
            const { a: act, spot: at, atStop: inside } = latest.current;
            if (!at) return;
            const ev = fenceEvent(at, { lat: pos.coords.latitude, lon: pos.coords.longitude }, pos.coords.accuracy, inside);
            if (ev === 'arrived') act.arriveNow(true);
            if (ev === 'left') act.askLeft(pos.timestamp || Date.now());
          },
        );
        if (cancelled) s2.remove();
        else sub = s2;
      } catch {
        // Location unavailable: buttons still work.
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [on, atStop]);

  return null;
}
