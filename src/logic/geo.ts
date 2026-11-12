/**
 * Location math for noticing stops: distance between points and a simple
 * geofence with a gap between "in" and "out" so GPS jitter at a big yard
 * doesn't flip it back and forth.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** Inside this distance of a saved facility counts as pulling in. */
export const ENTER_M = 250;
/** Farther than this from the facility counts as having left. */
export const EXIT_M = 600;
/** Readings worse than this are ignored. */
export const MAX_ACCURACY_M = 150;

/** Great-circle distance in metres. */
export function distanceM(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type FenceEvent = 'arrived' | 'left' | null;

/**
 * What one location reading means for a stop.
 * `atStop` is whether Docket currently has the driver at this facility.
 * A reading with poor accuracy never triggers anything.
 */
export function fenceEvent(place: LatLon, here: LatLon, accuracyM: number | null, atStop: boolean): FenceEvent {
  if (accuracyM != null && accuracyM > MAX_ACCURACY_M) return null;
  const d = distanceM(place, here);
  if (!atStop && d <= ENTER_M) return 'arrived';
  if (atStop && d >= EXIT_M) return 'left';
  return null;
}
