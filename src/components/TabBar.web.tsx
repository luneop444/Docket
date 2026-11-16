import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
const SLIDE = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)';
/** What each kind of tab sits on, so the icons' cut-outs match it. */
const ON_PILL = '#4B4B4B';
const ON_BAR = '#D3D3D3';

/**
 * Web tab bar as a glass pill holding a smaller glass pill, matched to Edward's
 * reference (a glass volume slider) by sampling its colors:
 * - bar: grey 110 at 30% over the page blurred 28px, a light rim brightest along
 *   the top, and a soft drop shadow;
 * - selected pill: inset concentrically, darker toward its top (inner shadow), a
 *   bright rim line strongest along its bottom, and blue dispersion inside its
 *   trailing end with a warm touch at the top corner.
 * The reference's inner pill also shows sky bent in from beyond the bar's edge;
 * the web can only refract what is directly under an element, so that part is
 * left out. iOS 26 uses Apple's own glass (TabBar.tsx).
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(0, TABS.findIndex((t) => t.href === path));
  // The pill follows a tap at once, before the next screen starts rendering.
  const [tapped, setTapped] = useState<number | null>(null);
  const index = tapped ?? routeIndex;

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the slide start on the next frame, then switch screens.
    requestAnimationFrame(() => requestAnimationFrame(() => router.navigate(href)));
  };

  const tabW = width ? (width - PAD * 2) / TABS.length : 0;

  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <div aria-hidden style={S.blur} />
        <div aria-hidden style={S.tint} />
        {tabW ? (
          <div
            aria-hidden
            style={{ ...S.pill, width: tabW, transform: `translate3d(${PAD + index * tabW}px, 0, 0)` }}
            onTransitionEnd={() => setTapped(null)}
          />
        ) : null}
        {/* Above the pill. A tab turns white once the pill has landed on it: the web
            can't keep a cut-out in step with a sliding pill (Safari runs the two on
            different threads), so mid-slide every label stays ink. */}
        <Row onTab={go} index={index} lit={tapped === null ? index : -1} />
      </nav>
    </div>
  );
}

function Row({ onTab, index, lit }: { onTab: (i: number, href: string) => void; index: number; lit: number }) {
  return (
    <div style={S.row}>
      {TABS.map(({ href, label, Icon }, i) => {
        const on = i === lit;
        const fg = on ? '#FFFFFF' : color.ink;
        return (
          <button
            key={href}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => onTab(i, href)}
            style={S.tab}
          >
            <Icon on={false} c={fg} cut={on ? ON_PILL : ON_BAR} />
            <span style={{ ...S.label, color: fg }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
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
  // edge and the text under it stays readable. The blur samples a box 48px larger
  // on every side; the bar's rounded clip shows only its middle.
  blur: {
    position: 'absolute',
    inset: -48,
    pointerEvents: 'none',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
  },
  // The reference's grey 110 at 30% lands on 209 over white. Browsers mirror the
  // screen's bottom edge into the blur, so text under a bar this low stays sharp;
  // the same 209 made with grey 178 at 60% hides that text twice as well.
  tint: {
    position: 'absolute',
    inset: 0,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'none',
    background: 'rgba(178,178,178,0.60)',
    boxShadow:
      'inset 0 1.5px 0 rgba(255,255,255,0.32), inset 0 -1.5px 0 rgba(255,255,255,0.14), inset 1px 0 0 rgba(255,255,255,0.12), inset -1px 0 0 rgba(255,255,255,0.12)',
  },
  // Darker than the reference's inner pill (that one sat on a black photo) so
  // white labels on it keep 4.5:1 over Docket's white page.
  pill: {
    position: 'absolute',
    top: PAD,
    left: 0,
    height: LENS_H,
    borderRadius: LENS_H / 2,
    pointerEvents: 'none',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.62), rgba(0,0,0,0.50))',
    boxShadow:
      'inset 0 0 0 1px rgba(255,255,255,0.28), inset 0 -1.5px 0 rgba(255,255,255,0.55), inset 0 3px 5px rgba(0,0,0,0.35), inset -6px 0 7px -3px rgba(70,110,210,0.65), inset -2px -1px 3px -1px rgba(150,170,255,0.55), inset -3px 3px 4px -3px rgba(255,210,150,0.25)',
    transition: SLIDE,
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
  label: { ...(type.labelTab as CSSProperties), lineHeight: `${type.labelTab.lineHeight}px` },
};
