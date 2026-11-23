import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createGlass, type Glass } from './glassGL';
import { color, glassLift, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { BAR_TINT_GL, GLASS_CHROMA, frostSlice, GLASS_RIM, GLASS_STANDIN, glassK, glassReach, lensMap, mapData, scrollerUnder } from './glassLook';
import { MOVE_EVENT } from './contentMove';
import { isStale, pictureOf, sliceAt, type PagePicture, type Slice } from './pagePicture';
import { BEND, SPEC } from './glassPicture';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

export { mapData, scrollerUnder };

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Claims', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

const PAD = 4;
const PILL_H = TAB_PILL - PAD * 2;
const SLIDE_MS = 320;
const SLIDE = `transform ${SLIDE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;

/**
 * Tint, pill and icons from Edward's reference (Reddit's iOS 26 tab bar, 17 Nov): white
 * glass at 62%, a light grey pill, black icons (filled when selected, outlined otherwise)
 * and black labels. Size, frost and bend stay as they were.
 */
/** The selected pill: light grey glass over the bar. */
const PILL_TINT = 'rgba(215,216,218,0.5)';


const rgba = (r: number, g: number, b: number, a: number): [number, number, number, number] => [r / 255, g / 255, b / 255, a];
/** The tints as the shader takes them: colour and strength. */
const PILL_TINT_GL = rgba(215, 216, 218, 0.5);


interface Current {
  path: string;
  p: PagePicture;
  /** The slice the glass has loaded. */
  slice: Slice | null;
}

/**
 * Web tab bar in liquid glass: a clear glass bar holding a grey glass pill that slides
 * between tabs. Both bend the page under them at their rims, with a colour split and a
 * shaded edge, live on every frame (see glassGL.ts). The page is the screen's one picture of
 * its content (pagePicture.ts), shared with any other glass on it and taken once the screen
 * settles; scrolling only moves the glass over it, so nothing is pictured mid-scroll.
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
  const pic = useRef<Current | null>(null);

  // One frame: where the page, the bar and the pill are now.
  const frame = useCallback(() => {
    const g = gls.current, p = pic.current, bar = barRef.current, pill = pillRef.current;
    if (!g || !p || !bar || !pill) return;
    const cr = p.p.el.getBoundingClientRect(), br = bar.getBoundingClientRect(), pr = pill.getBoundingClientRect();
    // The slice holding the bar and everything its rim reads.
    const reach = glassReach(TAB_PILL);
    const sl = sliceAt(p.p, br.top - cr.top - reach, TAB_PILL + reach * 2);
    if (sl !== p.slice) {
      const f = frostSlice(sl, p.p.scale);
      g.bar.setPage(f);
      g.pill.setPage(f);
      p.slice = sl;
    }
    // Ready once both the page (just above) and the lens maps are in. Checking before handing
    // the page over (19 Nov) meant it never drew, and the bar showed its plain stand-in.
    if (!g.bar.ready() || !g.pill.ready()) return;
    const base = {
      pageOrigin: [cr.left, cr.top + sl.top] as [number, number],
      pageSize: [p.p.width, sl.height] as [number, number],
      barOrigin: [br.left, br.top] as [number, number],
      barSize: [br.width, br.height] as [number, number],
      pillOrigin: [pr.left, pr.top] as [number, number],
      pillSize: [pr.width, pr.height] as [number, number],
      scale,
      barK: glassK(TAB_PILL),
      lensK: glassK(pr.height),
      chroma: GLASS_CHROMA,
      spec: SPEC,
      // No rim on the selection pill: inside the bar its bright top and dark bottom read as an
      // outline. It's told apart by its grey against the bar's white, as in iOS 26's tab bar.
      pillSpec: 0,
      barTint: BAR_TINT_GL,
      pillTint: PILL_TINT_GL,
    };
    g.bar.draw({ ...base, outOrigin: [br.left, br.top], outSize: [br.width, br.height], isPill: false });
    g.pill.draw({ ...base, outOrigin: [pr.left, pr.top], outSize: [pr.width, pr.height], isPill: true });
    // The content changed size (a section opened): its new picture comes once nothing scrolls.
    if (isStale(p.p.el)) takePicture.current();
  }, [scale]);

  // The screen's picture, shared and taken once it settles.
  const retries = useRef(0);
  const takePicture = useRef<() => void>(() => {});
  const picture = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const scroller = scrollerUnder(bar);
    // Right after a tab switch the new screen may not be laid out yet: look again shortly.
    if (!scroller && retries.current < 4) {
      retries.current++;
      setTimeout(() => takePicture.current(), 400);
      return;
    }
    // A screen too short to scroll: the whole app root, less the bar itself.
    const content = ((scroller?.firstElementChild as HTMLElement | null) ?? document.getElementById('root')) as HTMLElement | null;
    if (!content) return setNote('nothing under the bar to draw');
    setNote('picturing the screen');
    const at = path;
    void pictureOf(content, bar.parentElement).then((p) => {
      if (!p) return;
      if (at !== path) return;
      pic.current = { path: at, p, slice: null };
      setLiveFor(at);
      setNote(`live · ${scroller ? 'scrolling list' : 'whole screen'} · ${p.slices.length} slice(s) at ${p.scale.toFixed(2)}x`);
      requestAnimationFrame(frame);
    });
  }, [path, frame]);
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
      mapData(lensMap(width, TAB_PILL), width, TAB_PILL, { x: 0, y: 0, w: width, h: TAB_PILL }, scale),
      mapData(lensMap(tabW, PILL_H), tabW, PILL_H, { x: 0, y: 0, w: tabW, h: PILL_H }, scale),
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
    // The new screen fades in; a picture taken mid-fade comes out washed white, so wait it out.
    const t = setTimeout(() => picture(), 700);
    return () => clearTimeout(t);
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
    document.addEventListener(MOVE_EVENT, kick);
    const onResize = () => {
      pic.current = null;
      setLiveFor(null);
      setTimeout(() => picture(), 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('scroll', kick, { capture: true });
      document.removeEventListener(MOVE_EVENT, kick);
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
        </div>
        <div style={S.rim} />
        <div style={S.row}>
          {TABS.map(({ href, label, Icon }, i) => {
            const on = i === index;
            return (
              <button key={href} type="button" role="tab" aria-selected={on} onClick={() => go(i, href)} style={S.tab}>
                <Icon on={on} c={color.ink} />
                <span style={S.label}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
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
    ...GLASS_STANDIN,
    // No dark hairline round the bar. The selection pill sits 4pt inside it, so the hairline and
    // the 4pt of bright bar between them drew a ring round the pill, read as a stroke. The bar
    // floats over scrolling content and is held apart by its lift and blur; cards keep the
    // hairline, where it's their edge against the canvas.
    boxShadow: glassLift,
  },
  cv: { position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'opacity 120ms', pointerEvents: 'none' },
  rim: {
    position: 'absolute',
    inset: 0,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'none',
    boxShadow: GLASS_RIM,
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
  label: { ...(type.labelTab as CSSProperties), lineHeight: `${type.labelTab.lineHeight}px`, color: color.ink },
};
