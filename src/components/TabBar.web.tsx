import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createGlass, type Glass } from './glassGL';
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
const BEND = typeof window === 'undefined' ? BEND_DEFAULT : bendSetting();
const AAVE = { w: 88, h: 40, x: 27.3 * BEND, y: 9.46 * BEND };
// Colour fringe = bend × (split − 1). The fringe stays the same width at any bend: red
// 0.88 and green 0.43 of Aave's offset past blue (at 5x, a split of 1.176 / 1.086).
const CHROMA = [1 + 0.88 / BEND, 1 + 0.43 / BEND, 1];
const SPEC = 1.5;
/** Room above and below the bar that the picture must also cover, for the bend to read. */
const M = 28;

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;

const rgba = (r: number, g: number, b: number, a: number): [number, number, number, number] => [r / 255, g / 255, b / 255, a];
/** The tints as the shader takes them: colour and strength. */
const BAR_TINT_GL = rgba(255, 255, 255, 0.35);
const PILL_TINT_GL = rgba(229, 232, 236, 0.55);

interface Picture {
  el: HTMLElement;
  path: string;
  /** Content y the picture's top row shows, and the band it covers. */
  top: number;
  bandTop: number;
  height: number;
  w: number;
  h: number;
  /** An element under the bar when the picture was taken, and where it sits in the picture. */
  anchor: HTMLElement;
  ax: number;
  ay: number;
}

/**
 * Web tab bar in liquid glass: a clear glass bar holding a grey glass pill that slides
 * between tabs. Both bend the page under them at their rims, with a colour split and a
 * shaded edge, live on every frame (see glassGL.ts). The page is drawn to a picture once
 * per screen, a band around the bar (html2canvas), and drawn again only when a scroll
 * leaves the band; each frame then only says where things are now.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const barCv = useRef<HTMLCanvasElement>(null);
  const pillCv = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(0, TABS.findIndex((t) => t.href === path));
  // The pill moves on the tap, before the next screen starts rendering.
  const [tapped, setTapped] = useState<number | null>(null);
  const index = tapped ?? routeIndex;
  // The glass is live for the screen its picture was taken of.
  const [liveFor, setLiveFor] = useState<string | null>(null);
  const live = liveFor === path;
  // Prototype diagnosis: open any page with ?glass=debug to see what the glass did last.
  const [debug] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (new URLSearchParams(window.location.search).get('glass') === 'debug') sessionStorage.setItem('glass', 'debug');
      return sessionStorage.getItem('glass') === 'debug';
    } catch {
      return false;
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
  const scale = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);

  const gls = useRef<{ bar: Glass; pill: Glass } | null>(null);
  const pic = useRef<Picture | null>(null);
  const busy = useRef(false);
  const takePicture = useRef<() => void>(() => {});
  const lastShot = useRef(0);
  const retries = useRef(0);

  // One frame: where the page, the bar and the pill are now.
  const frame = useCallback(() => {
    const g = gls.current, p = pic.current, bar = barRef.current, pill = pillRef.current;
    if (!g || !p || !bar || !pill || !g.bar.ready()) return;
    const cr = p.el.getBoundingClientRect(), br = bar.getBoundingClientRect(), pr = pill.getBoundingClientRect();
    // The picture follows the element that was under the bar when it was taken, so it moves
    // with the page whichever element scrolls (on a phone that isn't always the one found).
    const ar = p.anchor.isConnected ? p.anchor.getBoundingClientRect() : null;
    const origin: [number, number] = ar && ar.height > 0 ? [ar.left - p.ax, ar.top - p.ay] : [cr.left, cr.top + p.top];
    const base = {
      pageOrigin: origin,
      pageSize: [p.w, p.h] as [number, number],
      barOrigin: [br.left, br.top] as [number, number],
      barSize: [br.width, br.height] as [number, number],
      pillOrigin: [pr.left, pr.top] as [number, number],
      pillSize: [pr.width, pr.height] as [number, number],
      scale,
      barK: [AAVE.x * (TAB_PILL / AAVE.h), 0.5556 * AAVE.y * (TAB_PILL / AAVE.h)] as [number, number],
      lensK: [AAVE.x * (pr.width / AAVE.w), 0.5556 * AAVE.y * (pr.height / AAVE.h)] as [number, number],
      chroma: CHROMA as [number, number, number],
      spec: SPEC,
      barTint: BAR_TINT_GL,
      pillTint: PILL_TINT_GL,
    };
    g.bar.draw({ ...base, outOrigin: [br.left, br.top], outSize: [br.width, br.height], isPill: false });
    g.pill.draw({ ...base, outOrigin: [pr.left, pr.top], outSize: [pr.width, pr.height], isPill: true });
    // A scroll that leaves the band asks for a new picture of the part now under the bar.
    // Past the end of the content there is nothing more to draw, so that doesn't count as
    // leaving the band (on Paycheck, scrolled to the bottom, it re-drew in a loop).
    const need = br.top - M - cr.top, end = p.el.scrollHeight;
    const below = need + TAB_PILL + M * 2 > p.bandTop + p.height && p.bandTop + p.height < end - 1;
    if (!busy.current && (need < p.bandTop - 1 || below) && performance.now() - lastShot.current > 500) takePicture.current();
  }, [scale]);

  // The picture: a band of the screen around the bar, frosted, handed to the glass.
  const picture = useCallback(async () => {
    const bar = barRef.current, g = gls.current;
    if (!bar || !g || busy.current) return;
    busy.current = true;
    lastShot.current = performance.now();
    try {
      const r = bar.getBoundingClientRect();
      const scroller = scrollerUnder(bar);
      // Right after a tab switch the new screen may not be laid out yet; until its scroller
      // is there, draw what's there and look again shortly.
      if (!scroller && retries.current < 4) {
        retries.current++;
        setTimeout(() => takePicture.current(), 400);
      }
      // A screen too short to scroll: draw the whole app root.
      const content = ((scroller?.firstElementChild as HTMLElement | null) ?? document.getElementById('root')) as HTMLElement | null;
      if (!content) return setNote('nothing under the bar to draw');
      setNote('drawing this part of the screen');
      const cr0 = content.getBoundingClientRect();
      const need = r.top - M - cr0.top;
      const band = Math.round(window.innerHeight * 1.5);
      const top = Math.max(0, Math.min(content.scrollHeight - band, need - band / 2));
      // html2canvas copies the whole page before drawing; rows far from the bar are left
      // out of that copy, the bulk of the work on a long list. Leaving rows out moves the
      // rest up, so one element under the bar is marked and measured in the copy to put the
      // picture back in place.
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
          return b.bottom - cr0.top < top || b.top - cr0.top > top + band;
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
      g.bar.setPage(frosted(cv, scale));
      g.pill.setPage(frosted(cv, scale));
      const ar0 = anchor.getBoundingClientRect();
      pic.current = {
        el: content,
        path,
        top: shift,
        bandTop: top,
        height: Math.min(band, content.scrollHeight - top),
        w: cv.width / scale,
        h: cv.height / scale,
        anchor,
        ax: ar0.left - cr0.left,
        ay: anchorY - shift,
      };
      setLiveFor(path);
      setNote(`live · ${scroller ? 'scrolling list' : 'whole screen'} · ${Math.round(scale)}x · ${navigator.userAgent.includes('Chrome/') ? 'Chrome' : 'Safari'}`);
      requestAnimationFrame(frame);
    } finally {
      busy.current = false;
    }
  }, [path, scale, frame]);
  useEffect(() => {
    takePicture.current = () => void picture();
  }, [picture]);

  // Set up the glass once the canvases and sizes are known; maps are built once per size.
  useEffect(() => {
    const bc = barCv.current, pc = pillCv.current;
    if (!bc || !pc || !width || !tabW) return;
    if (!gls.current) {
      try {
        const bar = createGlass(bc), pill = createGlass(pc);
        if (!bar || !pill) {
          void Promise.resolve().then(() => setNote('this browser has no WebGL'));
          return;
        }
        gls.current = { bar, pill };
      } catch (e) {
        void Promise.resolve().then(() => setNote(`glass failed: ${e instanceof Error ? e.message : String(e)}`));
        return;
      }
    }
    const g = gls.current;
    let alive = true;
    Promise.all([
      mapData(sliceMap(width, TAB_PILL), width, TAB_PILL, { x: 0, y: 0, w: width, h: TAB_PILL }, scale),
      mapData(GLASS_MAP, tabW, PILL_H, { x: 0, y: 0, w: tabW, h: PILL_H }, scale),
    ]).then(([bm, lm]) => {
      if (!alive) return;
      g.bar.setMaps(bm, lm);
      g.pill.setMaps(bm, lm);
      requestAnimationFrame(frame);
    });
    return () => {
      alive = false;
    };
  }, [width, tabW, scale, frame]);

  // A new screen needs a new picture; until it's in, the plain tints stand in.
  useEffect(() => {
    pic.current = null;
    retries.current = 0;
    // The new screen fades in, so a picture taken mid-fade comes out washed white, and a
    // short screen like Paycheck never scrolls far enough to take another. So a second
    // picture follows once the fade is done.
    const t = setTimeout(() => void picture(), 250);
    const t2 = setTimeout(() => takePicture.current(), 900);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [path, picture]);

  // Every frame something moves: scrolling, and the pill's slide.
  useEffect(() => {
    let raf = 0;
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        frame();
      });
    };
    document.addEventListener('scroll', kick, { capture: true, passive: true });
    const onResize = () => {
      pic.current = null;
      setLiveFor(null);
      setTimeout(() => void picture(), 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('scroll', kick, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [frame, picture]);

  useEffect(() => {
    if (tapped === null) return;
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      frame();
      if (performance.now() - t0 < SLIDE_MS + 80) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tapped, frame]);

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the slide start on the next frame, then switch screens.
    requestAnimationFrame(() => requestAnimationFrame(() => router.navigate(href)));
  };

  const x = PAD + index * tabW;
  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      {debug ? <div style={S.debug}>{`Glass: ${note} · bend ${BEND}x`}</div> : null}
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <canvas ref={barCv} aria-hidden style={{ ...S.cv, opacity: live ? 1 : 0 }} />
        <div
          ref={pillRef}
          aria-hidden
          onTransitionEnd={() => setTapped(null)}
          style={{ ...S.pill, width: tabW || 0, transform: `translate3d(${x}px, 0, 0)` }}
        >
          <canvas ref={pillCv} style={{ ...S.cv, opacity: live ? 1 : 0, borderRadius: PILL_H / 2 }} />
          <div style={S.pillRim} />
        </div>
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
 * The scrolling element under the bar: the nearest scroll area around whatever is actually
 * showing under the bar's middle. Screens the app keeps loaded behind the current one
 * (Today stays loaded under Paycheck) are skipped, because they aren't what's showing.
 */
function scrollerUnder(bar: HTMLElement): HTMLElement | null {
  const r = bar.getBoundingClientRect();
  const hits = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  let fallback: HTMLElement | null = null;
  // From the top layer down: transparent layers over the list (a drawer's hit area) have no
  // scroll area of their own, so the first hit that sits in one that scrolls wins.
  for (const h of hits) {
    if (bar.parentElement?.contains(h) || h === document.documentElement || h === document.body) continue;
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
