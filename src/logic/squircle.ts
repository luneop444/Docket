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
