/**
 * Where the sample page lands in the photo. The page is a sheet folded in three for the
 * envelope and opened again, lying on the seat, seen by a phone held a little off square:
 *
 * - the panels sit at slightly different angles, so the middle one is foreshortened and the
 *   folds stand up a touch (its edges kink at the folds, as real folded paper's do);
 * - the far (top) edge is a little narrower than the near one: the phone isn't square on;
 * - the bottom right corner curls up off the seat;
 * - and the whole sheet is turned a couple of degrees.
 *
 * `map` takes a point on the flat page (u, v from 0 to 1) to the screen, and `shade` says
 * how much light that bit of paper catches. The scanner's outline and scrim use `quad`, the
 * same corners, so they land on the drawn page exactly.
 */

const TURN = (-2.2 * Math.PI) / 180;
/** Panel heights as they appear: the middle one tips away, so it's foreshortened. */
const PANELS = [0.338, 0.318, 0.344];
const FOLD1 = 1 / 3;
const FOLD2 = 2 / 3;
/** How far the far edge narrows, as a share of the width (keystone). */
const KEYSTONE = 0.05;
/** How high the folds stand, in points. */
const RIDGE = 0.8;
/** How high the corner curls, in points. */
const CURL = 7;

/** Where v lands on the page's height once the panels are foreshortened (0 to 1). */
function along(v: number) {
  const [a, b, c] = PANELS;
  if (v <= FOLD1) return (v / FOLD1) * a;
  if (v <= FOLD2) return a + ((v - FOLD1) / (FOLD2 - FOLD1)) * b;
  return a + b + ((v - FOLD2) / (1 - FOLD2)) * c;
}

/** How high the paper stands off the seat at (u, v), in points. */
export function lift(u: number, v: number) {
  // A fold stands up in a narrow ridge, a few millimetres either side of the crease.
  const ridge = (f: number) => Math.max(0, 1 - Math.abs(v - f) / 0.014);
  const corner = Math.pow(Math.max(0, (u - 0.72) / 0.28), 2) * Math.pow(Math.max(0, (v - 0.8) / 0.2), 2);
  return RIDGE * (ridge(FOLD1) * 0.9 + ridge(FOLD2)) + CURL * corner;
}

export function map(u: number, v: number, x: number, y: number, w: number, h: number): [number, number] {
  const vv = along(v);
  const z = lift(u, v);
  // Keystone: the far edge narrower. Standing paper (z) sits a little nearer and higher.
  const k = 1 - KEYSTONE * (1 - vv);
  const px = (u - 0.5) * w * k * (1 + z / 400);
  const py = (vv - 0.5) * h - z * 0.55;
  const c = Math.cos(TURN), s = Math.sin(TURN);
  return [x + w / 2 + px * c - py * s, y + h / 2 + px * s + py * c];
}

/** The page's four corners on screen: top left, top right, bottom right, bottom left. */
export function quad(x: number, y: number, w: number, h: number): [number, number][] {
  return [map(0, 0, x, y, w, h), map(1, 0, x, y, w, h), map(1, 1, x, y, w, h), map(0, 1, x, y, w, h)];
}

/**
 * Light on the paper at (u, v): -1 (in shade) to 1 (catching light). The light comes from the
 * windshield, ahead and above: slopes facing it are lighter, slopes facing away darker.
 */
export function shade(u: number, v: number) {
  const e = 0.004;
  const dzdv = (lift(u, v + e) - lift(u, v - e)) / (2 * e);
  const dzdu = (lift(u + e, v) - lift(u - e, v)) / (2 * e);
  // Facing the light (rising toward the top of the page) is lighter.
  const slope = -dzdv * 0.012 + dzdu * 0.006;
  // The middle panel tips away from the light a touch.
  const panel = v > FOLD1 && v < FOLD2 ? -0.12 : 0;
  // Nearer the windshield (top) is a little brighter.
  const fall = (0.5 - v) * 0.08;
  return Math.max(-1, Math.min(1, slope + panel + fall));
}
