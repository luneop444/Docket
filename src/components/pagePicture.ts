/**
 * Web only (imported by the .web glass files). One picture of a screen's content for every glass on it (the onboarding pills, the A–Z
 * bubble). Liquid glass bends what's behind it, so it needs the page as an image
 * (html2canvas). Taking that picture stalls the page (about 0.15 to 0.25 s for a band, measured
 * on Pick company), so it is taken once, whole, when the screen has settled and nothing is
 * scrolling, then cut into overlapping slices the graphics chip accepts. Scrolling then only
 * moves the glass over slices it already has: nothing is pictured mid-scroll.
 *
 * Taken again only when the content changes size (a search filters the list, a section
 * opens). Changes that keep the size (a tile turning lime) are not re-pictured: the glass
 * frosts what's behind it, and a running clock would otherwise re-picture every second.
 */
import { color, protoColor } from '../theme/tokens';
import { MOVE_EVENT } from './contentMove';

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;

export interface Slice {
  /** Where the slice starts and how tall it is, in points down the content. */
  top: number;
  height: number;
  /** The slice at `scale` device px per point, not frosted (each glass frosts its own). */
  canvas: HTMLCanvasElement;
}

export interface PagePicture {
  el: HTMLElement;
  scale: number;
  width: number;
  slices: Slice[];
}

/** Safari's largest canvas, in pixels (16,777,216), less a margin. */
const MAX_AREA = 16_000_000;
/** Each slice overlaps the next by this much, so any glass up to OVERLAP tall, rim reads included, fits in one. */
export const OVERLAP = 480;

let maxTex = 0;
function maxTexture(): number {
  if (maxTex) return maxTex;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    maxTex = gl ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 4096;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    maxTex = 4096;
  }
  return maxTex;
}

const cache = new WeakMap<HTMLElement, { key: string; job: Promise<PagePicture | null> }>();
let lastScroll = 0;
if (typeof window !== 'undefined') {
  document.addEventListener('scroll', () => (lastScroll = performance.now()), { capture: true, passive: true });
  document.addEventListener(MOVE_EVENT, () => (lastScroll = performance.now()));
}

/** Why the last picture failed, for the ?glass=debug readout ('' when it didn't). */
let lastFailure = '';
export const pictureFailure = () => lastFailure;
/** Frees canvases now (Safari holds their memory until collected otherwise). */
/** What the last picture had to leave out to stay readable (debug). */
let leftOut = 'nothing';
export const pictureLeftOut = () => leftOut;

/** Whether the page can read a canvas back (it can't once it's tainted). */
function readable(c: HTMLCanvasElement): boolean {
  try {
    c.getContext('2d')?.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

function release(cs: HTMLCanvasElement[]) {
  for (const c of cs) {
    c.width = 0;
    c.height = 0;
  }
}

const keyOf = (el: HTMLElement) => `${el.scrollHeight}x${el.clientWidth}`;

/** Resolves once nothing has scrolled for a moment and the browser is idle. */
function settled(): Promise<void> {
  return new Promise((done) => {
    const check = () => {
      if (performance.now() - lastScroll < 250) return void setTimeout(check, 150);
      const idle = (window as unknown as { requestIdleCallback?: (f: () => void, o: object) => void }).requestIdleCallback;
      if (idle) idle(() => done(), { timeout: 500 });
      else setTimeout(done, 0);
    };
    check();
  });
}

/** The current picture of `el`, taking it if it's missing or `el` has changed size. */
/** `skip`: something inside `el` that the picture leaves out (the tab bar, when `el` is the whole app). */
/**
 * How to picture: the page (html2canvas); the scene as shown now; or the scene's moving layer
 * at rest, transforms ignored, under the scrim's even dark (for glass that only sits outside
 * the frame and slides its picture with the scene, see backdrop.ts sceneShift).
 */
export type PictureMode = 'page' | 'scene' | 'rest';
export function pictureOf(el: HTMLElement, skip?: Element | null, mode: PictureMode | boolean = 'page'): Promise<PagePicture | null> {
  const scene: PictureMode = mode === true ? 'scene' : mode === false ? 'page' : mode;
  const key = keyOf(el);
  const had = cache.get(el);
  if (had && had.key === key) return had.job;
  const job = take(el, key, skip ?? null, scene);
  cache.set(el, { key, job });
  // The picture this one replaces is let go once the new one is in: iPhone Safari counts a
  // canvas against its memory cap until it's sized to zero, not when it's dropped.
  if (had) {
    void job.then((next) => {
      if (next) void had.job.then((old) => old && old !== next && release(old.slices.map((x) => x.canvas)));
    });
  }
  return job;
}

/** Drop the picture of `el`, so the next pictureOf takes a new one (the content changed in place). */
export function forget(el: HTMLElement) {
  // Marked out of date rather than dropped, so the next picture lets this one's canvases go.
  const had = cache.get(el);
  if (had) had.key = '';
}

/** Whether the picture of `el` is out of date (it changed size since). */
export function isStale(el: HTMLElement): boolean {
  const had = cache.get(el);
  return !had || had.key !== keyOf(el);
}

async function take(el: HTMLElement, key: string, skip: Element | null, scene: PictureMode): Promise<PagePicture | null> {
  await settled();
  // Changed again while waiting: the newer request takes over.
  if (keyOf(el) !== key || !el.isConnected) return null;
  const w = el.clientWidth, h = el.scrollHeight;
  if (!w || !h) return null;
  // As sharp as the screen, but the whole content must fit in one Safari canvas.
  const scale = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(MAX_AREA / (w * h)));
  const { default: html2canvas } = (await import('html2canvas')) as unknown as { default: Html2Canvas };
  // iPhone Safari can mark the picture "insecure" (tainted) from something drawn into it, and
  // then the glass may not read it at all ("The operation is insecure", Claims, 24 Nov). So the
  // picture is checked, and taken again leaving out the icons, then all images, until it's clean.
  const skipBase = (e: Element) => (!!skip && skip.contains(e)) || (e as HTMLElement).dataset?.noglass === '1';
  const leaveOut: ((e: Element) => boolean)[] = [
    () => false,
    (e) => e.tagName.toLowerCase() === 'svg',
    (e) => ['svg', 'img', 'canvas', 'video', 'picture'].includes(e.tagName.toLowerCase()),
  ];
  let shot: HTMLCanvasElement | null = null;
  if (scene !== 'page') shot = await paintScene(el, scale, scene === 'rest');
  else {
    for (let i = 0; i < leaveOut.length; i++) {
      const out = leaveOut[i];
      shot = await html2canvas(el, {
        scale,
        backgroundColor: color.canvas,
        logging: false,
        // Skipped too: anything marked as not part of the scene (the camera's grain).
        ignoreElements: (e: Element) => skipBase(e) || out(e),
      }).catch(() => null);
      if (!shot || readable(shot)) {
        leftOut = ['nothing', 'icons', 'images'][i];
        break;
      }
      release([shot]);
      shot = null;
      lastFailure = 'every picture came back insecure';
    }
    if (!shot && lastFailure === 'every picture came back insecure') return null;
  }
  if (!shot) {
    lastFailure = 'the page picture came back empty (out of canvas memory?)';
    return null;
  }
  // Slices no taller than the graphics chip takes in one texture.
  const tall = Math.max(OVERLAP * 2, Math.floor(Math.min(maxTexture(), 8192) / scale));
  const step = tall - OVERLAP;
  const slices: Slice[] = [];
  for (let top = 0; top < h; top += step) {
    const height = Math.min(tall, h - top);
    const c = document.createElement('canvas');
    c.width = shot.width;
    c.height = Math.round(height * scale);
    // Safari refuses a canvas once the page's canvases pass its memory cap: say so, don't throw.
    const g = c.getContext('2d');
    if (!g) {
      lastFailure = `no canvas for a slice (${c.width}x${c.height}): out of canvas memory`;
      release(slices.map((x) => x.canvas).concat(shot, c));
      return null;
    }
    g.drawImage(shot, 0, Math.round(top * scale), shot.width, c.height, 0, 0, c.width, c.height);
    slices.push({ top, height, canvas: c });
    if (top + height >= h) break;
  }
  // The whole-page shot is only the source of the slices. Safari keeps a canvas's memory until it's
  // collected unless it's sized to zero, and iPhone Safari caps all of a page's canvases together.
  release([shot]);
  lastFailure = '';
  return { el, scale, width: w, slices };
}

/** The slice holding y to y + h (points down the content), or the nearest one at the ends. */
export function sliceAt(p: PagePicture, y: number, h: number): Slice {
  for (const s of p.slices) if (y >= s.top && y + h <= s.top + s.height) return s;
  return y < 0 ? p.slices[0] : p.slices[p.slices.length - 1];
}

/**
 * A picture of a scene (the scanner's photo, its paper and its scrim) drawn straight from what
 * is on screen: each photo, canvas and SVG at the box the browser shows it in. html2canvas gets
 * this kind of layered, transformed scene wrong (the photo at the wrong scale and place, the
 * paper's canvas missing), and the glass then bends that. Rotations aren't followed: the scene
 * is pictured at rest, where there are none (the paper draws its own turn).
 */
async function paintScene(el: HTMLElement, scale: number, rest = false): Promise<HTMLCanvasElement | null> {
  const w = el.clientWidth, h = el.scrollHeight;
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  if (!g) return null;
  g.scale(scale, scale);
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const o = el.getBoundingClientRect();
  const opacityOf = (e: Element) => {
    let a = 1;
    for (let n: Element | null = e; n && n !== el.parentElement; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity || '1');
    return a;
  };
  const load = (src: string) =>
    new Promise<HTMLImageElement | null>((done) => {
      const im = new Image();
      im.onload = () => (im.decode ? im.decode().then(() => done(im), () => done(im)) : done(im));
      im.onerror = () => done(null);
      im.src = src;
    });
  // At rest: each element's layout box, which CSS transforms don't move.
  const restBox = (e: HTMLElement) => {
    let x = 0, y = 0;
    for (let n: HTMLElement | null = e; n && n !== el; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
      if (n.offsetParent === el) break;
    }
    return { left: x, top: y, width: e.offsetWidth, height: e.offsetHeight };
  };
  for (const e of Array.from(el.querySelectorAll('*'))) {
    if (e.closest('[data-noglass="1"]')) continue;
    if (e instanceof SVGElement && (e.ownerSVGElement || rest)) continue; // drawn with its <svg>; at rest, the scrim is even
    let x: number, y: number, r: { width: number; height: number };
    if (rest && e instanceof HTMLElement) {
      const b = restBox(e);
      x = b.left;
      y = b.top;
      r = b;
    } else {
      const b = e.getBoundingClientRect();
      x = b.left - o.left;
      y = b.top - o.top;
      r = b;
    }
    if (!r.width || !r.height) continue;
    const a = opacityOf(e);
    if (a <= 0.01) continue;
    g.globalAlpha = a;
    if (e instanceof HTMLCanvasElement) {
      g.drawImage(e, x, y, r.width, r.height);
    } else if (e instanceof SVGSVGElement) {
      // Sized on a copy (its own width and height may be "100%", which means nothing alone).
      const copy = e.cloneNode(true) as SVGSVGElement;
      copy.setAttribute('width', String(r.width));
      copy.setAttribute('height', String(r.height));
      copy.removeAttribute('class');
      copy.removeAttribute('style');
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
      const im = await load(url);
      URL.revokeObjectURL(url);
      if (im) g.drawImage(im, x, y, r.width, r.height);
    } else if (e instanceof HTMLElement && !(e instanceof HTMLImageElement)) {
      const cs = getComputedStyle(e);
      const m = /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage);
      if (!m) continue;
      const im = await load(m[1]);
      if (!im) continue;
      // Cover (the photo) or contain, centred, as the browser sizes it.
      const fit = cs.backgroundSize === 'contain' ? Math.min : Math.max;
      const k = fit(r.width / im.naturalWidth, r.height / im.naturalHeight);
      const iw = im.naturalWidth * k, ih = im.naturalHeight * k;
      g.save();
      g.beginPath();
      g.rect(x, y, r.width, r.height);
      g.clip();
      g.drawImage(im, x + (r.width - iw) / 2, y + (r.height - ih) / 2, iw, ih);
      g.restore();
    }
  }
  g.globalAlpha = 1;
  if (rest) {
    g.fillStyle = protoColor.scrim;
    g.fillRect(0, 0, w, h);
  }
  return c;
}
