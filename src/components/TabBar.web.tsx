import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { color, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { GLASS_MAP } from './glassMap';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

const PAD = 4;
const PILL_H = TAB_PILL - PAD * 2;
const SLIDE_MS = 320;
const SLIDE = `transform ${SLIDE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;

/** The bar's glass: white at 35% over the page, frosted 1px, as Edward asked. */
const BAR_TINT = 'rgba(255,255,255,0.35)';
const FROST = 1;
/** The selected pill: grey glass, the cards' second grey (#E5E8EC) at 55%. */
const PILL_TINT = 'rgba(229,232,236,0.55)';
/**
 * Aave's glass ("Building glass for the web"): their lens map, drawn for an 88x40 lens.
 * Bend: 2.2 times their 27.3px across and 9.46px down, so the page under the glass reads
 * as bent and not just frosted. Colour split 1.5 times their strongest demo (the switch):
 * red 30% and green 15% further than blue. Rim highlight strength 1.5, from their demos.
 */
const AAVE = { w: 88, h: 40, x: 27.3 * 2.2, y: 9.46 * 2.2 };
const CHROMA = [1.3, 1.15, 1];
const SPEC = 1.5;
/** Room around each piece of glass for its bend to read the page just past its edge. */
const M = 28;

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;

/**
 * Web tab bar in liquid glass: a clear glass bar holding a lime-tinted glass pill that
 * slides between tabs. Both bend the page under them at their rims, with a colour split
 * and a shaded edge, Aave's method done on pixels: when nothing is moving, the page under
 * the bar is drawn to an image (html2canvas) and each pixel is read from where the map
 * pushes it. That runs the same in every browser; Safari silently skips SVG filters this
 * size on a phone. While the page scrolls or the pill slides, the bend steps aside and the
 * same tints and rims stand in, then it comes back.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const barCv = useRef<HTMLCanvasElement>(null);
  const pillCv = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(0, TABS.findIndex((t) => t.href === path));
  // The pill moves on the tap, before the next screen starts rendering.
  const [tapped, setTapped] = useState<number | null>(null);
  const index = tapped ?? routeIndex;
  const [bent, setBent] = useState(false);
  // Prototype diagnosis: open any page with ?glass=debug to see what the glass did last.
  const [debug] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (new URLSearchParams(window.location.search).get('glass') === 'debug') sessionStorage.setItem('glass', 'debug');
      return sessionStorage.getItem('glass') === 'debug';
    } catch {
      return new URLSearchParams(window.location.search).get('glass') === 'debug';
    }
  });
  const [note, setNote] = useState('starting');

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tabW = width ? (width - PAD * 2) / TABS.length : 0;

  // Draw the glass from a fresh picture of the page under the bar.
  const run = useRef(0);
  const snap = useRef<{ el: HTMLElement; path: string; cv: HTMLCanvasElement; scale: number; top: number; bandTop: number; height: number } | null>(null);
  const drawGlass = async () => {
    const bar = barRef.current, bc = barCv.current, pc = pillCv.current;
    if (!bar || !bc || !pc || !tabW) return setNote('waiting for layout');
    const id = ++run.current;
    const r = bar.getBoundingClientRect();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const W = r.width + M * 2, H = TAB_PILL + M * 2;

    // The slow part, once per screen: the scrolling content under the bar, drawn whole.
    const scroller = scrollerUnder(bar);
    // A screen too short to scroll: draw the whole app root instead, still only once.
    const content = ((scroller?.firstElementChild as HTMLElement | null) ?? document.getElementById('root')) as HTMLElement | null;
    if (!content) return setNote('nothing under the bar to draw');
    // Only a band around the bar is drawn (a 42,000px list is too big for one picture on a
    // phone); it's drawn again only when a scroll leaves it.
    const cr0 = content.getBoundingClientRect();
    const need = r.top - M - cr0.top;
    const s0 = snap.current;
    if (!s0 || s0.el !== content || s0.path !== path || need < s0.bandTop || need + H > s0.bandTop + s0.height) {
      setNote('drawing this part of the screen');
      if (debug) console.log('[glass] snapshot', path, s0 ? (s0.el !== content ? 'new element' : s0.path !== path ? 'new path' : 'left band') : 'first', content.scrollHeight);
      const band = Math.round(window.innerHeight * 1.5);
      const top = Math.max(0, Math.min(content.scrollHeight - band, need - band / 2));
      // html2canvas copies the whole page before drawing; rows far from the bar are left out
      // of that copy, which is most of the work on a long list. Leaving rows out moves the
      // rest up, so one element under the bar is marked and measured in the copy to put the
      // picture back in place.
      const bandTop = top, bandBottom = top + band;
      const hit = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => content.contains(e) && e !== content) as HTMLElement | undefined;
      const anchor = hit ?? content;
      const anchorY = anchor.getBoundingClientRect().top - cr0.top;
      content.setAttribute('data-glass-root', '');
      anchor.setAttribute('data-glass-anchor', '');
      let shift = 0;
      const { default: html2canvas } = (await import('html2canvas')) as unknown as { default: Html2Canvas };
      const cv = await html2canvas(content, {
        scale,
        backgroundColor: color.bg,
        logging: false,
        ignoreElements: (el: Element) => {
          if (el === bar.parentElement) return true;
          if (!content.contains(el) || el === content || el.contains(anchor)) return false;
          const b = el.getBoundingClientRect();
          const y0 = b.top - cr0.top, y1 = b.bottom - cr0.top;
          return y1 < bandTop || y0 > bandBottom;
        },
        onclone: (doc: Document) => {
          const root = doc.querySelector('[data-glass-root]'), a = doc.querySelector('[data-glass-anchor]');
          if (root && a) shift = anchorY - (a.getBoundingClientRect().top - root.getBoundingClientRect().top);
        },
      }).catch((e: unknown) => {
        setNote(`picture failed: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });
      anchor.removeAttribute('data-glass-anchor');
      content.removeAttribute('data-glass-root');
      if (!cv) return;
      snap.current = { el: content, path, cv, scale, top: shift, bandTop: top, height: Math.min(band, content.scrollHeight - top) };
    }
    const picture = snap.current;
    if (id !== run.current || !picture) return;

    // The fast part, after every scroll: crop the strip now under the bar.
    const cr = content.getBoundingClientRect();
    const shot = document.createElement('canvas');
    shot.width = Math.round(W * scale);
    shot.height = Math.round(H * scale);
    const sctx = shot.getContext('2d')!;
    sctx.fillStyle = color.bg;
    sctx.fillRect(0, 0, shot.width, shot.height);
    const sc = picture.scale;
    sctx.drawImage(picture.cv, (r.left - M - cr.left) * sc, (r.top - M - cr.top - picture.top) * sc, W * sc, H * sc, 0, 0, shot.width, shot.height);

    const [barMap, lensMap] = await Promise.all([
      cachedMap(`bar-${Math.round(r.width)}-${scale}`, () => mapData(sliceMap(r.width, TAB_PILL), W, H, { x: M, y: M, w: r.width, h: TAB_PILL }, scale)),
      cachedMap(`lens-${Math.round(tabW)}-${scale}`, () => mapData(GLASS_MAP, tabW + M * 2, PILL_H + M * 2, { x: M, y: M, w: tabW, h: PILL_H }, scale)),
    ]);
    if (id !== run.current) return;

    // The bar: the page bent at the bar's rim, then its tint.
    const page = frosted(shot, scale);
    bend(page, barMap, AAVE.x * (TAB_PILL / AAVE.h) * scale, AAVE.y * (TAB_PILL / AAVE.h) * scale);
    const bctx = page.getContext('2d')!;
    bctx.fillStyle = BAR_TINT;
    bctx.fillRect(0, 0, page.width, page.height);
    paint(bc, page, M, M, r.width, TAB_PILL, scale);

    // The pill: the bar under it, with the lime tint, bent again by the lens.
    const x = PAD + index * tabW;
    const lens = document.createElement('canvas');
    lens.width = Math.round((tabW + M * 2) * scale);
    lens.height = Math.round((PILL_H + M * 2) * scale);
    const lctx = lens.getContext('2d')!;
    lctx.drawImage(page, Math.round((x) * scale), Math.round((PAD) * scale), lens.width, lens.height, 0, 0, lens.width, lens.height);
    lctx.fillStyle = PILL_TINT;
    lctx.fillRect(0, 0, lens.width, lens.height);
    bend(lens, lensMap, AAVE.x * (tabW / AAVE.w) * scale, AAVE.y * (PILL_H / AAVE.h) * scale);
    paint(pc, lens, M, M, tabW, PILL_H, scale);
    setBent(true);
    setNote(`bent · ${Math.round(scale)}x · ${navigator.userAgent.includes('Chrome/') ? 'Chrome' : 'Safari'}`);
  };

  const draw = useCallback(async () => {
    try {
      await drawGlass();
    } catch (e) {
      setNote(`failed: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tabW]);


  // Re-draw when things settle: after a scroll, a resize, a slide or a new screen.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const settle = (ms: number) => {
      run.current++;
      setBent(false);
      setNote('waiting for the page to settle');
      clearTimeout(t);
      t = setTimeout(draw, ms);
    };
    settle(tapped === null ? 250 : SLIDE_MS + 60);
    const onScroll = () => settle(80);
    const onResize = () => {
      snap.current = null;
      settle(250);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [draw, tapped, path]);

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the slide start on the next frame, then switch screens.
    requestAnimationFrame(() => requestAnimationFrame(() => router.navigate(href)));
  };

  const x = PAD + index * tabW;
  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      {debug ? <div style={S.debug}>{`Glass: ${note}`}</div> : null}
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <canvas ref={barCv} aria-hidden style={{ ...S.cv, opacity: bent ? 1 : 0 }} />
        {tabW ? (
          <div
            aria-hidden
            onTransitionEnd={() => setTapped(null)}
            style={{ ...S.pill, width: tabW, transform: `translate3d(${x}px, 0, 0)` }}
          >
            <canvas ref={pillCv} style={{ ...S.cv, opacity: bent ? 1 : 0, borderRadius: PILL_H / 2 }} />
            <div style={S.pillRim} />
          </div>
        ) : null}
        <div style={S.rim} />
        <div style={S.row}>
          {TABS.map(({ href, label, Icon }, i) => {
            const on = i === index;
            return (
              <button key={href} type="button" role="tab" aria-selected={on} onClick={() => go(i, href)} style={S.tab}>
                <Icon on={on} c={on ? color.signal : color.sub} />
                <span style={{ ...S.label, color: on ? color.ink : color.sub }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/**
 * The page frosted, on pixels (a box blur run three times, close to a Gaussian), so it
 * looks the same in Safari, whose canvas has no blur filter.
 */
function frosted(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const r = Math.max(1, Math.round(FROST * scale * 0.8));
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
 * The scrolling element under the bar: of the scrollable elements the bar's middle sits
 * over, the outermost. Found by position, not by what the finger last touched, so the
 * screen is drawn once when it opens and not again on its first scroll.
 */
function scrollerUnder(bar: HTMLElement): HTMLElement | null {
  const r = bar.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best: HTMLElement | null = null;
  for (const e of Array.from(document.querySelectorAll<HTMLElement>('div'))) {
    if (bar.parentElement?.contains(e) || e.scrollHeight <= e.clientHeight + 1) continue;
    const oy = getComputedStyle(e).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') continue;
    const b = e.getBoundingClientRect();
    if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom || b.width === 0) continue;
    if (!best || b.height * b.width > best.getBoundingClientRect().height * best.getBoundingClientRect().width) best = e;
  }
  return best;
}

/** Bend maps are the same for a given size, so each is built once. */
const maps = new Map<string, Promise<ImageData>>();
function cachedMap(key: string, make: () => Promise<ImageData>) {
  if (!maps.has(key)) maps.set(key, make());
  return maps.get(key)!;
}

/** Copy the glass's own area out of a window that has M of room around it. */
function paint(dst: HTMLCanvasElement, src: HTMLCanvasElement, x: number, y: number, w: number, h: number, scale: number) {
  dst.width = Math.round(w * scale);
  dst.height = Math.round(h * scale);
  dst.getContext('2d')!.drawImage(src, Math.round(x * scale), Math.round(y * scale), dst.width, dst.height, 0, 0, dst.width, dst.height);
}

/**
 * Aave's filter, on pixels: red and green in the map say where each pixel is read from
 * (128 is still), red reaching 13% and green 6.5% further than blue for the colour split;
 * blue darkens the rim.
 */
function bend(cv: HTMLCanvasElement, map: ImageData, kx: number, ky: number) {
  const ctx = cv.getContext('2d')!;
  const w = cv.width, h = cv.height;
  const src = ctx.getImageData(0, 0, w, h).data, m = map.data;
  const out = ctx.createImageData(w, h), o = out.data;
  const off = 1 + (SPEC * 128) / 255, kyy = 0.5556 * ky;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = m[i] / 255 - 0.5, dy = m[i + 1] / 255 - 0.5;
      const shade = Math.max(0, off - (SPEC * m[i + 2]) / 255);
      for (let c = 0; c < 3; c++) {
        const ux = Math.min(w - 1, Math.max(0, Math.round(x + dx * kx * CHROMA[c])));
        const uy = Math.min(h - 1, Math.max(0, Math.round(y + dy * kyy * CHROMA[c])));
        o[i + c] = Math.min(255, src[(uy * w + ux) * 4 + c] * shade);
      }
      o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

/** A map image laid on a neutral (128) field the size of the glass's window, at device scale. */
function mapData(src: string | Promise<string>, w: number, h: number, box: { x: number; y: number; w: number; h: number }, scale: number) {
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
function sliceMap(w: number, h: number): Promise<string> {
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

const S: Record<string, CSSProperties> = {
  wrap: { position: 'absolute', left: 20, right: 20, pointerEvents: 'none' },
  debug: { position: 'absolute', bottom: TAB_PILL + 8, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: color.ink, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 4 },
  // Stand-in glass while things move: the same tint over the page, frosted the same.
  bar: {
    position: 'relative',
    height: TAB_PILL,
    borderRadius: TAB_PILL / 2,
    overflow: 'hidden',
    pointerEvents: 'auto',
    background: BAR_TINT,
    backdropFilter: `blur(${FROST}px)`,
    WebkitBackdropFilter: `blur(${FROST}px)`,
    boxShadow: '0 0 0 0.5px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.08)',
  },
  cv: { position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'opacity 120ms', pointerEvents: 'none' },
  rim: {
    position: 'absolute',
    inset: 0,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.45)',
  },
  pill: {
    position: 'absolute',
    top: PAD,
    left: 0,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    background: PILL_TINT,
    pointerEvents: 'none',
    transition: SLIDE,
    willChange: 'transform',
  },
  pillRim: {
    position: 'absolute',
    inset: 0,
    borderRadius: PILL_H / 2,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 0 0 0.5px rgba(0,0,0,0.08)',
  },
  row: { position: 'absolute', inset: 0, display: 'flex', padding: PAD },
  tab: {
    flex: 1,
    height: PILL_H,
    border: 0,
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // RN line heights are px; in CSS a bare number would be a multiplier.
  label: { ...(type.labelTab as CSSProperties), lineHeight: `${type.labelTab.lineHeight}px` },
};
