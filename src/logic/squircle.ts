/**
 * Squircle path from Scott Dodge's Squircle plugin for Figma
 * (github.com/scotato/figma-squircle, MIT, src/squircle.ts):
 * each corner is one cubic Bézier from (0, r2) via (0, r1) and (r1, 0) to
 * (r2, 0), joined by straight edges, with r1 = r2 × 0.1765.
 * r2 is a share of the shorter side: 0.332 at the plugin's default curvature
 * (c = 5), 0.5 at its maximum (c = 10).
 */
export const SQUIRCLE_C5 = 0.332;
export const SQUIRCLE_C10 = 0.5;
export const SQUIRCLE_RATIO = 0.1765;

/**
 * Corner extent for a design radius R, using the plugin's fixed (pixel) mode.
 * A plugin corner cuts in 0.1912 × r2 at the 45° diagonal (Bézier midpoint:
 * 0.375 r1 + 0.125 r2); a circular corner cuts in (1 - cos 45°) × R = 0.2929 R.
 * Equal cut-in gives r2 = 1.532 R, so a squircle reads the same size as the
 * radius it replaces. Capped at half the shorter side (the plugin's c = 10).
 */
export const SQUIRCLE_PER_RADIUS = 0.2929 / (0.375 * SQUIRCLE_RATIO + 0.125);

export function squircleExtent(radius: number, w: number, h: number) {
  return Math.min(radius * SQUIRCLE_PER_RADIUS, Math.min(w, h) * SQUIRCLE_C10);
}

/** Path for a w × h box; r2 per corner (top-left, top-right, bottom-right, bottom-left), 0 keeps it square. */
export function squirclePath(w: number, h: number, r2: [number, number, number, number]) {
  const [tl, tr, br, bl] = r2;
  const k = (r: number) => r * SQUIRCLE_RATIO;
  return [
    `M 0 ${tl}`,
    `C 0 ${k(tl)} ${k(tl)} 0 ${tl} 0`,
    `L ${w - tr} 0`,
    `C ${w - k(tr)} 0 ${w} ${k(tr)} ${w} ${tr}`,
    `L ${w} ${h - br}`,
    `C ${w} ${h - k(br)} ${w - k(br)} ${h} ${w - br} ${h}`,
    `L ${bl} ${h}`,
    `C ${k(bl)} ${h} 0 ${h - k(bl)} 0 ${h - bl}`,
    'Z',
  ].join(' ');
}
