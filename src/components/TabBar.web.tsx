import { router, usePathname } from "expo-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { color, type } from "../theme/tokens";
import { TAB_PILL, useTabSpace } from "./Chrome";
import { GLASS_MAP } from "./glassMap";
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from "./Icons";

const TABS = [
  { href: "/today", label: "Today", Icon: TabTodayIcon },
  { href: "/paycheck", label: "Paycheck", Icon: TabPaycheckIcon },
  { href: "/companies", label: "Companies", Icon: TabCompaniesIcon },
] as const;

/**
 * Every value below is read off the toggle group on Aave's "Building glass for
 * the web" (its live page, not guessed), scaled from its 46px bar to our 64px one.
 */
/** Aave: 1px border + 2px padding around 40px items in a 46px bar. 3/46 of 64. */
const PAD = 4;
const LENS_H = TAB_PILL - PAD * 2;
/** Bar fill and hairline: Aave's #FAF9F9 and rgba(46,15,15,0.08). */
const BAR = "#FAF9F9";
const HAIRLINE = "rgba(46,15,15,0.08)";
/** Tabs outside the lens: Aave's grey label (#727274) and lighter grey icon (#BCBBBB). */
const OFF_LABEL = "#727274";
const OFF_ICON = "#BCBBBB";
/** Aave darkens the lens with black at 4%. */
const LENS_SHADE = "rgba(0,0,0,0.04)";
/**
 * Aave's bend, in px of its 88x40 lens: up to 0.0459 x 595 = 27.3px across, with
 * red 2% and green 1% stronger than blue for the color fringe, and green squeezed
 * to 0.556 of its range against 0.0459 x 206 = 9.5px down.
 */
const AAVE_LENS = { w: 88, h: 40, x: 27.3, y: 9.46 };
const CHROMA = [1.02, 1.01, 1];
/** Room around the lens for the bend to pull in what lies just past its edge. */
const M = 16;
const SLIDE_MS = 320;

/**
 * Web tab bar built the way Aave builds its toggle group: the glass is the
 * selection indicator and it bends its own content, not the page under it, so it
 * looks the same in Chromium, Safari and Firefox.
 * - The bar: Aave's off-white fill and hairline, grey tabs.
 * - The lens: a window over a copy of the bar with every tab drawn selected
 *   (black), bent by Aave's displacement map with a color fringe, its rim shaded
 *   by the map's blue channel, clipped to a pill, and shaded black at 4%. Its
 *   edges pull in the bar's own hairline, which is the rim you see.
 * One animation moves the window and counter-moves the copy each frame, so the
 * copy always lines up with the real tabs.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.href === path),
  );
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
  // Safari caches filter output by id and won't redraw it when the copy under it
  // moves, so the lens bends only at rest, with a fresh id each time it lands.
  const [landed, setLanded] = useState(0);
  const [still, setStill] = useState(true);
  const id = `glass-${Math.round(tabW)}-${landed}`;

  // Put the lens at x, in bar coordinates.
  const xRef = useRef<number | null>(null);
  const place = (x: number) => {
    xRef.current = x;
    const win = winRef.current,
      copy = copyRef.current,
      shade = shadeRef.current;
    if (win) win.style.transform = `translate3d(${x - M}px, ${PAD - M}px, 0)`;
    if (copy) copy.style.transform = `translate3d(${M - x}px, ${M - PAD}px, 0)`;
    if (shade) shade.style.transform = `translate3d(${x}px, ${PAD}px, 0)`;
  };

  useLayoutEffect(() => {
    if (!tabW) return;
    const to = PAD + index * tabW;
    const from = xRef.current;
    if (from === null || from === to) {
      place(to);
      if (tapped !== null) setTapped(null);
      return;
    }
    setStill(false);
    const t0 = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - t0) / SLIDE_MS);
      place(from + (to - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setTapped(null);
        setLanded((n) => n + 1);
        setStill(true);
      }
    });
    return () => cancelAnimationFrame(raf);
    // place reads only refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tabW]);

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the slide start on the next frame, then switch screens.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => router.navigate(href)),
    );
  };

  const winW = tabW + M * 2,
    winH = LENS_H + M * 2;
  const sx = AAVE_LENS.x * (tabW / AAVE_LENS.w);
  const sy = AAVE_LENS.y * (LENS_H / AAVE_LENS.h);
  // Aave squeezes green to 0.556 of its range against its own vertical scale;
  // here one scale serves both axes, so green is squeezed by that ratio as well.
  const g = 0.5556 * (sy / sx);
  const lens = { x: M, y: M, width: tabW, height: LENS_H };
  const spec = 1 + 128 / 255;

  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <Row onTab={go} index={index} />
        {tabW ? (
          <>
            {still ? (
              <svg
                width="0"
                height="0"
                style={{ position: "absolute" }}
                aria-hidden
              >
                <filter
                  id={id}
                  filterUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width={winW}
                  height={winH}
                  colorInterpolationFilters="sRGB"
                >
                  <feFlood floodColor="rgb(128,128,128)" result="mapBg" />
                  <feImage
                    href={GLASS_MAP}
                    preserveAspectRatio="none"
                    {...lens}
                    result="rawMap"
                  />
                  <feComposite
                    in="rawMap"
                    in2="mapBg"
                    operator="over"
                    result="map"
                  />
                  <feColorMatrix
                    in="map"
                    type="matrix"
                    values={`1 0 0 0 0  0 ${g} 0 0 ${(1 - g) / 2}  0 0 1 0 0  0 0 0 1 0`}
                    result="scaledMap"
                  />
                  {(["R", "G", "B"] as const).map((c, i) => (
                    <feDisplacementMap
                      key={c}
                      in="SourceGraphic"
                      in2="scaledMap"
                      scale={sx * CHROMA[i]}
                      xChannelSelector="R"
                      yChannelSelector="G"
                      result={`d${c}`}
                    />
                  ))}
                  <feColorMatrix
                    in="dR"
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="r"
                  />
                  <feColorMatrix
                    in="dG"
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="g"
                  />
                  <feColorMatrix
                    in="dB"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                    result="b"
                  />
                  <feComposite
                    in="r"
                    in2="g"
                    operator="arithmetic"
                    k2="1"
                    k3="1"
                    result="rg"
                  />
                  <feComposite
                    in="rg"
                    in2="b"
                    operator="arithmetic"
                    k2="1"
                    k3="1"
                    result="bent"
                  />
                  {/* Rim shading from the map's blue channel: 128 leaves it, more darkens. */}
                  <feColorMatrix
                    in="map"
                    type="matrix"
                    values={`0 0 -1 0 ${spec}  0 0 -1 0 ${spec}  0 0 -1 0 ${spec}  0 0 0 0 1`}
                    result="spec"
                  />
                  <feComposite
                    in="spec"
                    in2="bent"
                    operator="arithmetic"
                    k1="1"
                  />
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
                filter: still ? `url(#${id})` : "none",
                clipPath: `inset(${M}px round ${LENS_H / 2}px)`,
                WebkitClipPath: `inset(${M}px round ${LENS_H / 2}px)`,
              }}
            >
              <div ref={copyRef} style={{ ...S.copy, width }}>
                <div style={S.copyBar} />
                <Row lit />
              </div>
            </div>
            <div
              ref={shadeRef}
              aria-hidden
              style={{ ...S.shade, width: tabW }}
            />
          </>
        ) : null}
      </nav>
    </div>
  );
}

function Row({
  onTab,
  index,
  lit,
}: {
  onTab?: (i: number, href: string) => void;
  index?: number;
  lit?: boolean;
}) {
  return (
    <div style={S.row}>
      {TABS.map(({ href, label, Icon }, i) =>
        lit ? (
          <div key={href} style={S.tab}>
            {/* Aave colors the icons inside its lens; ours take Docket's lime, with black details. */}
            <Icon on c={color.signal} cut={color.ink} />
            <span style={{ ...S.label, color: color.ink }}>{label}</span>
          </div>
        ) : (
          <button
            key={href}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => onTab?.(i, href)}
            style={S.tab}
          >
            <Icon on={false} c={OFF_ICON} cut={BAR} />
            <span style={{ ...S.label, color: OFF_LABEL }}>{label}</span>
          </button>
        ),
      )}
    </div>
  );
}

/** cubic-bezier(0.2, 0.8, 0.2, 1). */
function ease(p: number): number {
  const bez = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let lo = 0,
    hi = 1,
    t = p;
  for (let i = 0; i < 20; i++) {
    t = (lo + hi) / 2;
    if (bez(t, 0.2, 0.2) < p) lo = t;
    else hi = t;
  }
  return bez(t, 0.8, 1);
}

const barBox: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: TAB_PILL / 2,
  background: BAR,
  boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
};

const S: Record<string, CSSProperties> = {
  wrap: { position: "absolute", left: 20, right: 20, pointerEvents: "none" },
  bar: {
    ...barBox,
    position: "relative",
    inset: "auto",
    height: TAB_PILL,
    pointerEvents: "auto",
  },
  // The page around the bar is white, as on Aave's page.
  win: {
    position: "absolute",
    top: 0,
    left: 0,
    overflow: "hidden",
    pointerEvents: "none",
    background: color.bg,
    willChange: "transform",
  },
  copy: {
    position: "absolute",
    top: 0,
    left: 0,
    height: TAB_PILL,
    willChange: "transform",
  },
  copyBar: barBox,
  shade: {
    position: "absolute",
    top: 0,
    left: 0,
    height: LENS_H,
    borderRadius: LENS_H / 2,
    background: LENS_SHADE,
    pointerEvents: "none",
    willChange: "transform",
  },
  row: { position: "absolute", inset: 0, display: "flex", padding: PAD },
  tab: {
    flex: 1,
    height: LENS_H,
    border: 0,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  // RN line heights are px; in CSS a bare number would be a multiplier.
  label: {
    ...(type.labelTab as CSSProperties),
    lineHeight: `${type.labelTab.lineHeight}px`,
  },
};
