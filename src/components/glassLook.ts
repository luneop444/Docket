import type { CSSProperties } from 'react';
import { glassEdge, glassLift, glassRim } from '../theme/tokens';
import { GLASS_MAP } from './glassMap';
import { AAVE, BEND, frosted } from './glassPicture';
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
 * further than blue (1 before 19 Nov). The fringe also grows with REFRACT.
 */
export const SPLAY = 1;
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
/** Bend for glass of this height, scaled from Aave's 40-tall lens the way the bar does. */
export const glassK = (h: number): [number, number] => [REFRACT * AAVE.x * (h / AAVE.h), REFRACT * 0.5556 * AAVE.y * (h / AAVE.h)];
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
          c.width = Math.round(w * scale);
          c.height = Math.round(h * scale);
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

/** Aave's map 9-sliced onto a bar: its ends at lens size for the bar's height, its middle column stretched. */
export function sliceMap(w: number, h: number): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const W = Math.round(w), Hh = Math.round(h);
      const cap = Math.min(W / 2, Math.round((AAVE.w / 2) * (Hh / AAVE.h)));
      const c = document.createElement('canvas');
      c.width = W;
      c.height = Hh;
      const ctx = c.getContext('2d')!;
      const half = img.width / 2;
      ctx.drawImage(img, 0, 0, half, img.height, 0, 0, cap, Hh);
      ctx.drawImage(img, half - 1, 0, 2, img.height, cap, 0, W - cap * 2, Hh);
      ctx.drawImage(img, half, 0, half, img.height, W - cap, 0, cap, Hh);
      res(c.toDataURL());
    };
    img.src = GLASS_MAP;
  });
}


/** A slice of the screen's picture, frosted by FROST, made once and shared by every glass. */
const frostedOf = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function frostSlice(sl: Slice, scale: number): HTMLCanvasElement {
  let f = frostedOf.get(sl.canvas);
  if (!f) {
    f = frosted(sl.canvas, scale, FROST);
    frostedOf.set(sl.canvas, f);
  }
  return f;
}
