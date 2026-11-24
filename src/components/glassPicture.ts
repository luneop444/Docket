/**
 * Shared by the tab bar and the A–Z letter bubble: the page frosted on pixels, and Aave's
 * lens made round for a circular piece of glass.
 */
import { GLASS_MAP } from './glassMap';

/**
 * Aave's glass ("Building glass for the web"): their lens map, drawn for an 88x40 lens.
 * Their map only bends the outer rim (the middle is flat, as in their demos), so the bend
 * shows as warping at the ends and edges, not across the middle.
 * Bend: BEND times their 27.3px across and 9.46px down. Prototype switch: open any page
 * with ?bend=8 (or ?bend=max for 12, ?bend=reset) to try another strength; it sticks for
 * the tab.
 */
const BEND_DEFAULT = 5;
function bendSetting() {
  try {
    const q = new URLSearchParams(window.location.search).get('bend');
    if (q === 'reset') sessionStorage.removeItem('bend');
    else if (q) sessionStorage.setItem('bend', q === 'max' ? '12' : q);
    const v = parseFloat(sessionStorage.getItem('bend') ?? '');
    return v > 0 && v <= 20 ? v : BEND_DEFAULT;
  } catch {
    return BEND_DEFAULT;
  }
}
export const BEND = typeof window === 'undefined' ? BEND_DEFAULT : bendSetting();
export const AAVE = { w: 88, h: 40, x: 27.3 * BEND, y: 9.46 * BEND };
// Colour fringe = bend × (split − 1). The fringe stays the same width at any bend: red
// 0.88 and green 0.43 of Aave's offset past blue (at 5x, a split of 1.176 / 1.086).
export const CHROMA = [1 + 0.88 / BEND, 1 + 0.43 / BEND, 1];
/** Specular light on the rim. 2 since 20 Nov (was 1.5), for more depth. */
export const SPEC = 2;

/**
 * The page frosted, on pixels (a box blur run three times, close to a Gaussian), so it
 * looks the same in Safari, whose canvas has no blur filter.
 */
export function frosted(src: HTMLCanvasElement, scale: number, frost: number, inPlace = false): HTMLCanvasElement {
  if (frost <= 0) return src;
  // In place where the unfrosted picture isn't needed: a second full-size copy of every slice
  // ran iPhone Safari out of canvas memory, and the glass then kept the last screen's picture.
  const c = inPlace ? src : document.createElement('canvas');
  if (!inPlace) {
    c.width = src.width;
    c.height = src.height;
  }
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx || !c.width || !c.height) throw new Error(`no canvas to frost (${c.width}x${c.height}): out of canvas memory`);
  if (!inPlace) ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const r = Math.max(1, Math.round(frost * scale * 0.8));
  for (let k = 0; k < 3; k++) {
    boxBlur(img.data, c.width, c.height, r, true);
    boxBlur(img.data, c.width, c.height, r, false);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function boxBlur(d: Uint8ClampedArray, w: number, h: number, r: number, across: boolean) {
  const n = across ? w : h, lines = across ? h : w, line = new Float32Array(n * 3), win = r * 2 + 1;
  for (let l = 0; l < lines; l++) {
    for (let i = 0; i < n; i++) {
      const p = (across ? l * w + i : i * w + l) * 4;
      line[i * 3] = d[p];
      line[i * 3 + 1] = d[p + 1];
      line[i * 3 + 2] = d[p + 2];
    }
    for (let ch = 0; ch < 3; ch++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += line[Math.min(n - 1, Math.max(0, i)) * 3 + ch];
      for (let i = 0; i < n; i++) {
        const p = (across ? l * w + i : i * w + l) * 4;
        d[p + ch] = sum / win;
        sum += line[Math.min(n - 1, i + r + 1) * 3 + ch] - line[Math.max(0, i - r) * 3 + ch];
      }
    }
  }
}

/**
 * Aave's lens, round. Their map is drawn for an 88×40 capsule; its middle row is the rim's
 * profile, how far the glass bends the page at each distance in from the edge (red) and how
 * it shades it (blue). Turned around the centre, that profile becomes a circle that bends
 * inward all the way round, the same amount the tab bar does at its ends.
 */
export function roundLensMap(diameter: number, scale: number, lens: { w: number; h: number }, reach = 1): Promise<ImageData> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const pc = document.createElement('canvas');
      pc.width = img.width;
      pc.height = img.height;
      const pctx = pc.getContext('2d')!;
      pctx.drawImage(img, 0, 0);
      const row = pctx.getImageData(0, Math.floor(img.height / 2), Math.floor(img.width / 2), 1).data;
      const at = (x: number, ch: 0 | 2) => {
        const i = Math.max(0, Math.min(row.length / 4 - 1, x));
        const a = Math.floor(i), f = i - a, b = Math.min(row.length / 4 - 1, a + 1);
        return row[a * 4 + ch] * (1 - f) + row[b * 4 + ch] * f;
      };
      const N = Math.round(diameter * scale), R = N / 2;
      // Map pixels per bubble pixel: the map spans the lens's width, scaled to the bubble
      // by height, as the tab bar's ends are.
      const k = (img.width / lens.w) / ((diameter / lens.h) * scale * reach);
      const c = document.createElement('canvas');
      c.width = N;
      c.height = N;
      const ctx = c.getContext('2d')!;
      const out = ctx.createImageData(N, N);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const dx = x + 0.5 - R, dy = y + 0.5 - R, r = Math.hypot(dx, dy) || 1;
          const p = (y * N + x) * 4;
          const e = (R - r) * k;
          const bend = e < 0 ? 0 : at(e, 0) - 128;
          const shade = e < 0 ? 0 : at(e, 2) - 128;
          // Read inward: against the outward direction (dx, dy) / r.
          out.data[p] = 128 - (dx / r) * bend;
          out.data[p + 1] = 128 - (dy / r) * bend;
          out.data[p + 2] = 128 + shade;
          out.data[p + 3] = 255;
        }
      }
      res(out);
    };
    img.src = GLASS_MAP;
  });
}
