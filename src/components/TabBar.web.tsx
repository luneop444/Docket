import { router, usePathname } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { lensMap } from '../logic/lensMap';
import { color, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

/** Inner pill inset: the reference's 18 on a 250-tall bar, scaled to 64. Concentric with the bar. */
const PAD = 5;
const LENS_H = TAB_PILL - PAD * 2;
/** How far the frost samples past the bar, so its blur isn't mirrored at the bar's own edge. */
const BLEED = 48;
/** Lens: rim band depth and rim bend in px, magnification, and the filter's max shift (px). */
const DEPTH = 16;
const RIM = 12;
const ZOOM = 0.14;
const BEND = 40;
/** Color fringe at the rim: red and blue bend a little more and less than green. */
const CHROMA = 0.08;
const SLIDE_MS = 320;
/** What the tabs sit on, so the icons' cut-outs match it: the frost, and the clear lens over white. */
const ON_FROST = '#F7F7F7';
const ON_LENS = color.bg;

/**
 * Web tab bar matched to Edward's reference (a glass volume slider): the bar is
 * frosted glass, and the selected tab is liquid glass sitting in it.
 * - Frost: the page blurred 28px under a grey veil, with a light rim. It has a
 *   pill-shaped hole where the selected tab is, so the lens is clear, not frosted.
 * - Lens: no fill. In Chromium it bends the page under it through an SVG
 *   displacement map (src/logic/lensMap.ts, after Aave's "Building glass for the
 *   web"), magnifying the middle and splitting color at the rim. Safari can't run
 *   an SVG filter on what is behind an element, so there the lens is clear glass
 *   with the same rim. Bright rim line, darker groove around it, blue dispersion
 *   at its trailing end, all from the reference.
 * The hole and the lens are moved together by one animation each frame, so they
 * can't drift apart in either browser.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const frostRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(0, TABS.findIndex((t) => t.href === path));
  // The lens follows a tap at once, before the next screen starts rendering.
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
  const map = useMemo(() => (tabW && bends ? mapUrl(tabW, LENS_H) : ''), [tabW, bends]);
  // A new map gets a new id, so no browser reuses a cached filter.
  const id = `lens-${Math.round(tabW)}`;
  const hole = useMemo(() => (tabW ? holeUrl(tabW, LENS_H) : ''), [tabW]);

  // Place the lens and the frost's hole at x, in bar coordinates.
  const xRef = useRef<number | null>(null);
  const place = (x: number, still: boolean) => {
    xRef.current = x;
    const lens = lensRef.current, frost = frostRef.current;
    if (lens) {
      lens.style.transform = `translate3d(${x}px, 0, 0)`;
      // Bending on every frame of the slide stalls it; the bend comes back when it lands.
      lens.style.setProperty('backdrop-filter', still && map ? `url(#${id})` : 'none');
    }
    if (frost) {
      const pos = `${BLEED + x}px ${BLEED + PAD}px, 0 0`;
      frost.style.setProperty('mask-position', pos);
      frost.style.setProperty('-webkit-mask-position', pos);
    }
  };

  useLayoutEffect(() => {
    if (!tabW) return;
    const to = PAD + index * tabW;
    const from = xRef.current;
    if (from === null || from === to) {
      place(to, true);
      if (tapped !== null) setTapped(null);
      return;
    }
    const t0 = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - t0) / SLIDE_MS);
      place(from + (to - from) * ease(p), p === 1);
      if (p < 1) raf = requestAnimationFrame(step);
      else setTapped(null);
    });
    return () => cancelAnimationFrame(raf);
    // place reads only refs and values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tabW, map]);

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the slide start on the next frame, then switch screens.
    requestAnimationFrame(() => requestAnimationFrame(() => router.navigate(href)));
  };

  const mask = hole ? `url("${hole}"), linear-gradient(#000, #000)` : undefined;

  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <div
          ref={frostRef}
          aria-hidden
          style={{
            ...S.frost,
            ...(mask
              ? {
                  maskImage: mask,
                  WebkitMaskImage: mask,
                  maskSize: `${tabW}px ${LENS_H}px, 100% 100%`,
                  WebkitMaskSize: `${tabW}px ${LENS_H}px, 100% 100%`,
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskComposite: 'exclude',
                  WebkitMaskComposite: 'xor',
                }
              : null),
          }}
        />
        <div aria-hidden style={S.rim} />
        {tabW ? (
          <>
            {map ? (
              <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
                <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                  <feImage href={map} x="0" y="0" width={tabW} height={LENS_H} result="map" preserveAspectRatio="none" />
                  <feDisplacementMap in="SourceGraphic" in2="map" scale={BEND * (1 + CHROMA)} xChannelSelector="R" yChannelSelector="G" result="r" />
                  <feDisplacementMap in="SourceGraphic" in2="map" scale={BEND} xChannelSelector="R" yChannelSelector="G" result="g" />
                  <feDisplacementMap in="SourceGraphic" in2="map" scale={BEND * (1 - CHROMA)} xChannelSelector="R" yChannelSelector="G" result="b" />
                  <feColorMatrix in="r" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rr" />
                  <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gg" />
                  <feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bb" />
                  <feBlend in="rr" in2="gg" mode="screen" result="rg" />
                  <feBlend in="rg" in2="bb" mode="screen" />
                </filter>
              </svg>
            ) : null}
            <div ref={lensRef} aria-hidden style={{ ...S.lens, width: tabW }} />
          </>
        ) : null}
        <Row onTab={go} index={index} />
      </nav>
    </div>
  );
}

function Row({ onTab, index }: { onTab: (i: number, href: string) => void; index: number }) {
  return (
    <div style={S.row}>
      {TABS.map(({ href, label, Icon }, i) => {
        const on = i === index;
        return (
          <button
            key={href}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onTab(i, href)}
            style={S.tab}
          >
            <Icon on={on} c={color.ink} cut={on ? ON_LENS : ON_FROST} />
            <span style={S.label}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Same curve iOS-style sheets use: cubic-bezier(0.2, 0.8, 0.2, 1). */
function ease(p: number): number {
  const x1 = 0.2, y1 = 0.8, x2 = 0.2, y2 = 1;
  const bez = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let lo = 0, hi = 1, t = p;
  for (let i = 0; i < 20; i++) {
    t = (lo + hi) / 2;
    if (bez(t, x1, x2) < p) lo = t;
    else hi = t;
  }
  return bez(t, y1, y2);
}

/** Lens map as a PNG data URL, drawn once per lens size. */
function mapUrl(w: number, h: number): string {
  const cw = Math.round(w), ch = Math.round(h);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(cw, ch);
  img.data.set(lensMap(cw, ch, ch / 2, DEPTH, BEND, RIM, ZOOM));
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

/** The frost's hole: a pill the size of the lens, as an SVG mask image. */
function holeUrl(w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${h / 2}" fill="#000"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const S: Record<string, CSSProperties> = {
  wrap: { position: 'absolute', left: 20, right: 20, pointerEvents: 'none' },
  bar: {
    position: 'relative',
    height: TAB_PILL,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'auto',
    overflow: 'hidden',
    boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
  },
  // Browsers mirror the page at a blur's edges, so a 64px box blurred 28px is all
  // edge. The frost samples a box BLEED larger on every side; the bar's rounded
  // clip shows only its middle. Frost has no color of its own: it is whatever is
  // behind it, blurred and lifted by a white haze. (The reference reads grey only
  // because it sits on a dark photo.) Saturation keeps colors under it alive.
  frost: {
    position: 'absolute',
    inset: -BLEED,
    pointerEvents: 'none',
    background: 'rgba(255,255,255,0.62)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  },
  rim: {
    position: 'absolute',
    inset: 0,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'none',
    boxShadow:
      'inset 0 1.5px 0 rgba(255,255,255,0.32), inset 0 -1.5px 0 rgba(255,255,255,0.14), inset 1px 0 0 rgba(255,255,255,0.12), inset -1px 0 0 rgba(255,255,255,0.12)',
  },
  // Liquid glass: no fill. A bright hairline rim, the frost darkened just outside it
  // (the groove the lens sits in), and blue dispersion inside its trailing end.
  lens: {
    position: 'absolute',
    top: PAD,
    left: 0,
    height: LENS_H,
    borderRadius: LENS_H / 2,
    pointerEvents: 'none',
    boxShadow:
      '0 0 0 0.5px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(255,255,255,0.75), inset 0 -1.5px 0 rgba(255,255,255,0.9), inset 0 2px 3px rgba(0,0,0,0.06), inset -6px 0 7px -3px rgba(70,110,210,0.55), inset -2px -1px 3px -1px rgba(150,170,255,0.5)',
    willChange: 'transform',
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
  label: { ...(type.labelTab as CSSProperties), color: color.ink, lineHeight: `${type.labelTab.lineHeight}px` },
};
