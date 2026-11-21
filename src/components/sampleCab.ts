/**
 * The sample's photo: an empty passenger seat in daylight, seen from above. Shared by the
 * scene (SamplePhoto) and the paper (SamplePaper), which lights itself from it.
 */
export const CAB = require('../../assets/sample-cab.jpg');

/**
 * How far the photo runs past the screen on each side, as a fraction. Close enough that the
 * page lies on the seat's flat middle panel, inside the side bolsters and back from the
 * cushion's front edge, the way a sheet put down on a seat actually sits. It also leaves room
 * for the hand's drift so no edge ever shows.
 */
export const CAB_OVER = 0.22;

/** The photo's address on web, for drawing it onto a canvas. */
export function cabUri(): string | null {
  const s: unknown = CAB;
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object' && typeof (s as { uri?: unknown }).uri === 'string') return (s as { uri: string }).uri;
  if (typeof s === 'number') {
    const reg = (globalThis as Record<symbol, unknown>)[Symbol.for('react-native-web.AssetRegistry')] as
      | { httpServerLocation: string; name: string; type: string }[]
      | undefined;
    const a = reg?.[s - 1];
    return a ? `${a.httpServerLocation}/${a.name}.${a.type}` : null;
  }
  return null;
}
