import type { CSSProperties } from 'react';
import { glassEdge, glassLift, glassRim } from '../theme/tokens';
import { BEND, frosted } from './glassPicture';
import type { Slice } from './pagePicture';

/**
 * The nav bar's liquid glass, shared so anything else in glass (the onboarding back and
 * step pills) is the very same: tint, frost, edge, lift, rims, lens maps.
 * Values from Edward's reference (Reddit's iOS 26 tab bar, 17 Nov) and Figma style "Glass".
 */
export const BAR_TINT = 'rgba(255,255,255,0.62)';
/**
 * Frost on the picture under the glass, in points. 1 is the nav bar's approved glass; halving it
 * (19 Nov) made the bar read see-through, so it's back.
 */
export const FROST = 1;
/**
 * Refraction: the bend, against Aave's map scaled by height. 1.5 since 20 Nov (asked for more,
 * on all glass). The 19 Nov complaint about 1.5 was really the bar not drawing its glass at all
 * (fixed in cb1df35), so 1.5 had never been seen on the bar until now.
 */
export const REFRACT = 1.5;
/**
 * Splay, the colour split at the rim: red and green read this many times Aave's 0.88 and 0.43
 * further than blue (1 before 19 Nov). The fringe also grows with REFRACT. 0.6 since 23 Nov:
 * Edward asked for less dispersion on the nav bar; on the white bar the red and blue fringe at
 * the rim read as a colour edge rather than glass.
 */
export const SPLAY = 0.6;
export const GLASS_CHROMA: [number, number, number] = [1 + (0.88 * SPLAY) / BEND, 1 + (0.43 * SPLAY) / BEND, 1];
/** Room above and below the glass that the picture must also cover, for the bend to read. */
export const M = 28;
const rgba = (r: number, g: number, b: number, a: number): [number, number, number, number] => [r / 255, g / 255, b / 255, a];
/** The tint as the shader takes it: colour and strength. */
export const BAR_TINT_GL = rgba(255, 255, 255, 0.62);
/** Stand-in while the lens loads or things move: the same tint, frosted the same, edge and lift. */
export const GLASS_STANDIN: CSSProperties = {
  background: BAR_TINT,
  backdropFilter: `blur(${FROST}px)`,
  WebkitBackdropFilter: `blur(${FROST}px)`,
  boxShadow: `${glassEdge}, ${glassLift}`,
};
/** The rims drawn over the lens: the design system's glass rims, so every glass surface shares them. */
export const GLASS_RIM = glassRim;
/** A number tried from the address (?bezel=0.5), kept for the tab, else the default. */
function tryNum(key: string, def: number, min: number, max: number) {
  if (typeof window === 'undefined') return def;
  try {
    const q = new URLSearchParams(window.location.search).get(key);
    if (q === 'reset') sessionStorage.removeItem(key);
    else if (q) sessionStorage.setItem(key, q);
    const v = parseFloat(sessionStorage.getItem(key) ?? '');
    return v >= min && v <= max ? v : def;
  } catch {
    return def;
  }
}
/**
 * The rim that bends, as a share of the glass's height. Aave's map bent only its outer ~15%
 * (about 9px on the 64px bar), so more refraction only pushed a thin line harder. Apple's
 * glass bends a wide rim that magnifies what's under its edges. Try ?bezel=0.3 … 0.5.
 */
export const BEZEL = tryNum('bezel', 0.42, 0.05, 0.5);
/** How far the very edge reads in from the page, as a share of the glass's height, at REFRACT 1: the splay. 0.26 since 21 Nov (0.32 was a bit much), 0.2 on 23 Nov (asked for less splay on the nav bar), then 0.23 the same day (a little of it back), on all glass. Try ?lens=. */
export const LENS = tryNum('lens', 0.23, 0.05, 2);
/** Bend for glass of this height: the map's strongest value (0.45 off neutral) reads LENS × height in. */
export const glassK = (h: number): [number, number] => {
  const k = (REFRACT * LENS * h) / 0.45;
  return [k, k];
};
/** How far past its edge glass of this height reads the page: Aave's strongest bend (red 243), split included, plus room. */
export const glassReach = (h: number) => Math.ceil(((243 - 128) / 255) * glassK(h)[0] * GLASS_CHROMA[0]) + 8;

/**
 * The scrolling element under the bar: the nearest scroll area around whatever is actually
 * showing under the bar's middle. Screens the app keeps loaded behind the current one
 * (Today stays loaded under Paycheck) are skipped, because they aren't what's showing.
 */
export function scrollerUnder(bar: HTMLElement, own: HTMLElement | null = bar.parentElement): HTMLElement | null {
  const r = bar.getBoundingClientRect();
  const hits = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  let fallback: HTMLElement | null = null;
  // From the top layer down: transparent layers over the list (a drawer's hit area) have no
  // scroll area of their own, so the first hit that sits in one that scrolls wins.
  for (const h of hits) {
    if (own?.contains(h) || h === document.documentElement || h === document.body) continue;
    let e: HTMLElement | null = h as HTMLElement;
    while (e && e !== document.body) {
      const oy = getComputedStyle(e).overflowY;
      if (oy === 'auto' || oy === 'scroll') {
        if (e.scrollHeight > e.clientHeight + 1) return e;
        fallback = fallback ?? e;
        break;
      }
      e = e.parentElement;
    }
  }
  return fallback;
}

/** A map image laid on a neutral (128) field the size of the glass's window, at device scale. */
export function mapData(src: string | Promise<string>, w: number, h: number, box: { x: number; y: number; w: number; h: number }, scale: number) {
  return Promise.resolve(src).then(
    (url) =>
      new Promise<ImageData>((res) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          // A glass that hasn't been laid out yet is 0 wide; reading 0 pixels throws.
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          const ctx = c.getContext('2d')!;
          ctx.fillStyle = 'rgb(128,128,128)';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, box.x * scale, box.y * scale, box.w * scale, box.h * scale);
          res(ctx.getImageData(0, 0, c.width, c.height));
        };
        img.src = url;
      }),
  );
}

/**
 * The lens for a capsule of w × h (a circle when w = h), drawn rather than stretched from
 * Aave's image. Red bends across and green down, 128 is none: across the rim (BEZEL of the
 * height) each point reads the page further in toward the middle, steepest at the edge and
 * fading to flat, the same falloff as Aave's (their strongest 243 included). Blue darkens
 * the outer 3px a touch, as theirs does.
 */
export function lensMap(w: number, h: number, bezel = BEZEL): Promise<string> {
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const R = Math.min(W, H) / 2;
  const B = Math.max(3, bezel * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5;
      const cx = Math.min(Math.max(px, R), W - R);
      const cy = Math.min(Math.max(py, R), H - R);
      const dx = px - cx, dy = py - cy;
      const dist = Math.hypot(dx, dy);
      const inside = R - dist;
      let r = 128, g = 128, b = 128;
      if (inside >= 0 && dist > 0.001) {
        const t = Math.max(0, 1 - inside / B);
        const m = 0.9 * t * t;
        // Toward the middle: the opposite of the way out.
        r = 128 - (dx / dist) * m * 127.5;
        g = 128 - (dy / dist) * m * 127.5;
        b = 128 + 15 * Math.max(0, 1 - inside / 3);
      }
      const i = (y * W + x) * 4;
      img.data[i] = Math.round(r);
      img.data[i + 1] = Math.round(g);
      img.data[i + 2] = Math.round(b);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return Promise.resolve(c.toDataURL());
}
/** Kept for anything still asking for the old name. */
export const sliceMap = lensMap;


/** A slice of the screen's picture, frosted by FROST, made once and shared by every glass. */
const frostedOf = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function frostSlice(sl: Slice, scale: number, frost = FROST): HTMLCanvasElement {
  if (frost !== FROST) return frosted(sl.canvas, scale, frost);
  let f = frostedOf.get(sl.canvas);
  if (!f) {
    f = frosted(sl.canvas, scale, FROST);
    frostedOf.set(sl.canvas, f);
  }
  return f;
}

/** The glass's rims with a given shade on the lower inner rim (the system's is 4%). */
export const rimWith = (shade: number) => `inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,${shade}), inset 0 0 0 1px rgba(255,255,255,0.45)`;
/** The system's colour split, scaled. */
export const chromaTimes = (k: number): [number, number, number] => [1 + (GLASS_CHROMA[0] - 1) * k, 1 + (GLASS_CHROMA[1] - 1) * k, 1];
