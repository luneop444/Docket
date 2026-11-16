import { router, usePathname } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { color, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { GLASS_MAP } from './glassMap';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

/**
 * Read off Edward's screen recording of Figma's iOS tab bar (dark mode), mirrored
 * for Docket's light app:
 * - pill inset 10 of a 182 bar: 4 of 64;
 * - resting pill 28 levels lighter than the base in dark mode (67 on 39), so here
 *   black at 8% on the white tint;
 * - while it moves, the lens stands about a fifth taller than the pill, magnifies,
 *   squashes along its motion, and the bar swells slightly and clears;
 * - the lens takes about 320ms to cross, then shrinks and fades as the pill fades back.
 */
const PAD = 4;
const LENS_H = TAB_PILL - PAD * 2;
const MOVE_MS = 320;
const SETTLE_MS = 200;
/** Lens size against the pill while it travels, and how much it squashes per px/ms. */
const LIFT = 1.2;
const SQUASH = 0.12;
/** How far the tint's blur samples past the bar, so it isn't mirrored at the bar's edge. */
const BLEED = 48;
/** Room around the lens for its bend to pull in what lies past its edge. */
const M = 16;
/** Aave's bend ("Building glass for the web"), scaled from its 88x40 lens. */
const AAVE_LENS = { w: 88, h: 40, x: 27.3, y: 9.46 };
const CHROMA = [1.02, 1.01, 1];

/**
 * Web tab bar: tinted glass at rest with a soft pill under the selected tab; on a
 * tap the pill gives way to a clear glass lens that carries the tabs, magnified
 * and bent at its rim, to the new tab, then hands back to the pill. The lens bends
 * its own copy of the tabs (Aave's method), so the bend can't go stale. Chromium
 * draws the bend; Safari can't redraw an SVG filter on a moving element, so there
 * the lens magnifies without bending.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(0, TABS.findIndex((t) => t.href === path));
  // The new tab lights up on the tap, before the next screen starts rendering.
  const [tapped, setTapped] = useState<number | null>(null);
  const index = tapped ?? routeIndex;

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tabW = width ? (width - PAD * 2) / TABS.length : 0;
  const bends = useMemo(() => typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent), []);
  const id = `lens-${Math.round(tabW)}`;

  /** One frame: lens at x with scale sx/sy and opacity a; pill opacity p; bar swell s (0..1). */
  const frame = (x: number, sx: number, sy: number, a: number, p: number, s: number) => {
    const t = `translate3d(${x}px, ${PAD}px, 0) scale(${sx}, ${sy})`;
    if (winRef.current) {
      winRef.current.style.transform = `translate3d(${x - M}px, ${PAD - M}px, 0) scale(${sx}, ${sy})`;
      winRef.current.style.opacity = String(a);
      winRef.current.style.visibility = a > 0 ? 'visible' : 'hidden';
    }
    if (copyRef.current) copyRef.current.style.transform = `translate3d(${M - x}px, ${M - PAD}px, 0)`;
    if (rimRef.current) {
      rimRef.current.style.transform = t;
      rimRef.current.style.opacity = String(a);
    }
    if (pillRef.current) {
      pillRef.current.style.transform = `translate3d(${x}px, ${PAD}px, 0)`;
      pillRef.current.style.opacity = String(p);
    }
    if (barRef.current) barRef.current.style.transform = `scale(${1 + 0.03 * s})`;
    if (tintRef.current) tintRef.current.style.opacity = String(1 - 0.4 * s);
  };

  const xRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!tabW) return;
    const to = PAD + index * tabW;
    const from = xRef.current;
    xRef.current = to;
    if (from === null || from === to) {
      frame(to, 1, 1, 0, 1, 0);
      if (tapped !== null) setTapped(null);
      return;
    }
    const t0 = performance.now();
    let last = from, lastT = t0;
    let raf = requestAnimationFrame(function step(now) {
      const t = now - t0;
      if (t < MOVE_MS) {
        const p = t / MOVE_MS;
        const x = from + (to - from) * ease(p);
        // Velocity in px/ms stretches the lens along its motion and thins it across.
        const v = Math.abs(x - last) / Math.max(1, now - lastT);
        last = x;
        lastT = now;
        const grow = Math.min(1, p / 0.25);
        const k = Math.min(0.35, v * SQUASH);
        frame(x, (1 + (LIFT - 1) * grow) * (1 + k), (1 + (LIFT - 1) * grow) * (1 - k * 0.6), Math.min(1, p / 0.15), Math.max(0, 1 - p / 0.15), grow);
        raf = requestAnimationFrame(step);
      } else if (t < MOVE_MS + SETTLE_MS) {
        const q = (t - MOVE_MS) / SETTLE_MS;
        const sc = LIFT - (LIFT - 1) * q;
        frame(to, sc, sc, 1 - q, q, 1 - q);
        raf = requestAnimationFrame(step);
      } else {
        frame(to, 1, 1, 0, 1, 0);
        setTapped(null);
      }
    });
    return () => cancelAnimationFrame(raf);
    // frame reads only refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tabW]);

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the lens start on the next frame, then switch screens.
    requestAnimationFrame(() => requestAnimationFrame(() => router.navigate(href)));
  };

  const sx = AAVE_LENS.x * (tabW / AAVE_LENS.w);
  const sy = AAVE_LENS.y * (LENS_H / AAVE_LENS.h);
  const g = 0.5556 * (sy / (sx || 1));
  const spec = 1 + 128 / 255;
  const winW = tabW + M * 2, winH = LENS_H + M * 2;

  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <div ref={tintRef} aria-hidden style={S.tint} />
        <div aria-hidden style={S.rim} />
        {tabW ? <div ref={pillRef} aria-hidden style={{ ...S.pill, width: tabW }} /> : null}
        <Row onTab={go} index={index} />
      </nav>
      {/* The lens rides outside the bar's clip, so it can stand taller than the bar. */}
      {tabW ? (
        <>
          {bends ? (
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
              <filter id={id} filterUnits="userSpaceOnUse" x="0" y="0" width={winW} height={winH} colorInterpolationFilters="sRGB">
                <feFlood floodColor="rgb(128,128,128)" result="mapBg" />
                <feImage href={GLASS_MAP} x={M} y={M} width={tabW} height={LENS_H} preserveAspectRatio="none" result="rawMap" />
                <feComposite in="rawMap" in2="mapBg" operator="over" result="map" />
                <feColorMatrix in="map" type="matrix" values={`1 0 0 0 0  0 ${g} 0 0 ${(1 - g) / 2}  0 0 1 0 0  0 0 0 1 0`} result="scaledMap" />
                {(['R', 'G', 'B'] as const).map((c, i) => (
                  <feDisplacementMap key={c} in="SourceGraphic" in2="scaledMap" scale={sx * CHROMA[i]} xChannelSelector="R" yChannelSelector="G" result={`d${c}`} />
                ))}
                <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
                <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gg" />
                <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
                <feComposite in="r" in2="gg" operator="arithmetic" k2="1" k3="1" result="rg" />
                <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" result="bent" />
                <feColorMatrix in="map" type="matrix" values={`0 0 -1 0 ${spec}  0 0 -1 0 ${spec}  0 0 -1 0 ${spec}  0 0 0 0 1`} result="spec" />
                <feComposite in="spec" in2="bent" operator="arithmetic" k1="1" />
              </filter>
            </svg>
          ) : null}
          <div
            ref={winRef}
            aria-hidden
            style={{
              ...S.win,
              width: winW,
              height: winH,
              filter: bends ? `url(#${id})` : 'none',
              clipPath: `inset(${M}px round ${LENS_H / 2}px)`,
              WebkitClipPath: `inset(${M}px round ${LENS_H / 2}px)`,
            }}
          >
            <div ref={copyRef} style={{ ...S.copy, width }}>
              <Row index={index} />
            </div>
          </div>
          <div ref={rimRef} aria-hidden style={{ ...S.lensRim, width: tabW }} />
        </>
      ) : null}
    </div>
  );
}

function Row({ onTab, index }: { onTab?: (i: number, href: string) => void; index: number }) {
  return (
    <div style={S.row}>
      {TABS.map(({ href, label, Icon }, i) => {
        const on = i === index;
        const fg = on ? color.signal : color.ink;
        const body = (
          <>
            <Icon on={on} c={fg} />
            <span style={{ ...S.label, color: fg }}>{label}</span>
          </>
        );
        return onTab ? (
          <button key={href} type="button" role="tab" aria-selected={on} onClick={() => onTab(i, href)} style={S.tab}>
            {body}
          </button>
        ) : (
          <div key={href} style={S.tab}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** cubic-bezier(0.2, 0.8, 0.2, 1). */
function ease(p: number): number {
  const bez = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let lo = 0, hi = 1, t = p;
  for (let i = 0; i < 20; i++) {
    t = (lo + hi) / 2;
    if (bez(t, 0.2, 0.2) < p) lo = t;
    else hi = t;
  }
  return bez(t, 0.8, 1);
}

const S: Record<string, CSSProperties> = {
  wrap: { position: 'absolute', left: 20, right: 20, height: TAB_PILL, pointerEvents: 'none' },
  bar: {
    position: 'relative',
    height: TAB_PILL,
    borderRadius: TAB_PILL / 2,
    overflow: 'hidden',
    pointerEvents: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.08)',
  },
  // Tinted glass: the page blurred under a white tint. It samples a box BLEED larger
  // than the bar so the blur isn't mirrored at the edge; the bar's clip shows the bar.
  tint: {
    position: 'absolute',
    inset: -BLEED,
    pointerEvents: 'none',
    background: 'rgba(255,255,255,0.80)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  },
  // The reference's bright edge, strongest along the top.
  rim: {
    position: 'absolute',
    inset: 0,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,0.7)',
  },
  // The resting pill: a soft wash under the selected tab.
  pill: { position: 'absolute', top: 0, left: 0, height: LENS_H, borderRadius: LENS_H / 2, background: 'rgba(0,0,0,0.08)', pointerEvents: 'none' },
  // The lens: clear glass carrying a copy of the tabs. White behind the copy, as the
  // tinted bar over the white page is.
  win: { position: 'absolute', top: 0, left: 0, overflow: 'hidden', pointerEvents: 'none', background: color.bg, visibility: 'hidden', willChange: 'transform, opacity', transformOrigin: 'center' },
  copy: { position: 'absolute', top: 0, left: 0, height: TAB_PILL },
  // The lens's edge: a bright specular top, a darker bottom and a hairline.
  lensRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: LENS_H,
    borderRadius: LENS_H / 2,
    pointerEvents: 'none',
    opacity: 0,
    transformOrigin: 'center',
    willChange: 'transform, opacity',
    boxShadow:
      '0 6px 16px rgba(0,0,0,0.10), inset 0 1.5px 1px rgba(255,255,255,1), inset 0 -1px 1px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(0,0,0,0.14)',
  },
  row: { position: 'absolute', inset: 0, display: 'flex', padding: PAD },
  tab: {
    flex: 1,
    height: LENS_H,
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
