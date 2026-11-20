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
import { color } from '../theme/tokens';
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
export function pictureOf(el: HTMLElement, skip?: Element | null): Promise<PagePicture | null> {
  const key = keyOf(el);
  const had = cache.get(el);
  if (had && had.key === key) return had.job;
  const job = take(el, key, skip ?? null);
  cache.set(el, { key, job });
  return job;
}

/** Whether the picture of `el` is out of date (it changed size since). */
export function isStale(el: HTMLElement): boolean {
  const had = cache.get(el);
  return !had || had.key !== keyOf(el);
}

async function take(el: HTMLElement, key: string, skip: Element | null): Promise<PagePicture | null> {
  await settled();
  // Changed again while waiting: the newer request takes over.
  if (keyOf(el) !== key || !el.isConnected) return null;
  const w = el.clientWidth, h = el.scrollHeight;
  if (!w || !h) return null;
  // As sharp as the screen, but the whole content must fit in one Safari canvas.
  const scale = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(MAX_AREA / (w * h)));
  const { default: html2canvas } = (await import('html2canvas')) as unknown as { default: Html2Canvas };
  const shot = await html2canvas(el, {
    scale,
    backgroundColor: color.canvas,
    logging: false,
    ignoreElements: (e: Element) => !!skip && skip.contains(e),
  }).catch(() => null);
  if (!shot) return null;
  // Slices no taller than the graphics chip takes in one texture.
  const tall = Math.max(OVERLAP * 2, Math.floor(Math.min(maxTexture(), 8192) / scale));
  const step = tall - OVERLAP;
  const slices: Slice[] = [];
  for (let top = 0; top < h; top += step) {
    const height = Math.min(tall, h - top);
    const c = document.createElement('canvas');
    c.width = shot.width;
    c.height = Math.round(height * scale);
    c.getContext('2d')!.drawImage(shot, 0, Math.round(top * scale), shot.width, c.height, 0, 0, c.width, c.height);
    slices.push({ top, height, canvas: c });
    if (top + height >= h) break;
  }
  return { el, scale, width: w, slices };
}

/** The slice holding y to y + h (points down the content), or the nearest one at the ends. */
export function sliceAt(p: PagePicture, y: number, h: number): Slice {
  for (const s of p.slices) if (y >= s.top && y + h <= s.top + s.height) return s;
  return y < 0 ? p.slices[0] : p.slices[p.slices.length - 1];
}
