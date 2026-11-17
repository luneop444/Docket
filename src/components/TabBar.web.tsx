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

const PAD = 4;
const PILL_H = TAB_PILL - PAD * 2;
const SLIDE = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)';
const LIFT = '0 6px 20px rgba(0,0,0,0.08)';

/** White glass: white at 72% over the page blurred 16px, a hairline in Docket's line grey. */
const WHITE_GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  boxShadow: `inset 0 0 0 1px ${color.line}, ${LIFT}`,
};

interface Look {
  base: CSSProperties;
  pill: CSSProperties;
  icon: string;
  label: string;
}

/**
 * Four bar and pill colour pairs for review, all from Docket's tokens.
 * Prototype switch: open any page with ?nav=a, b, c or d; it holds until reload.
 */
const LOOKS: Record<'a' | 'b' | 'c' | 'd', Look> = {
  // White glass, the cards' second grey for the pill.
  a: { base: WHITE_GLASS, pill: { background: color.raise2 }, icon: color.ink, label: color.ink },
  // White glass, black pill: lime on black, as on the island and the detention card.
  b: { base: WHITE_GLASS, pill: { background: color.ink }, icon: color.signal, label: color.bg },
  // White glass, lime pill with black on it.
  c: { base: WHITE_GLASS, pill: { background: color.signal }, icon: color.onSignal, label: color.onSignal },
  // Card-grey glass (raise2 at 78%), a white pill lifted on it.
  d: {
    base: { background: 'rgba(229,232,236,0.78)', boxShadow: LIFT },
    pill: { background: color.bg, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' },
    icon: color.ink,
    label: color.ink,
  },
};

const pick = (): keyof typeof LOOKS => {
  if (typeof window === 'undefined') return 'b';
  const v = new URLSearchParams(window.location.search).get('nav');
  return v === 'a' || v === 'b' || v === 'c' || v === 'd' ? v : 'b';
};
const LOOK = LOOKS[pick()];

/** Web tab bar: a glass pill with the selected tab on a pill that slides between tabs. */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const routeIndex = Math.max(0, TABS.findIndex((t) => t.href === path));
  // The pill moves on the tap, before the next screen starts rendering.
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

  const go = (i: number, href: string) => {
    if (i === index) return;
    setTapped(i);
    // Let the slide start on the next frame, then switch screens.
    requestAnimationFrame(() => requestAnimationFrame(() => router.navigate(href)));
  };

  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      <nav ref={barRef} style={{ ...S.bar, ...LOOK.base }} aria-label="Tabs">
        {tabW ? (
          <div
            aria-hidden
            onTransitionEnd={() => setTapped(null)}
            style={{ ...S.pill, ...LOOK.pill, width: tabW, transform: `translate3d(${PAD + index * tabW}px, 0, 0)` }}
          />
        ) : null}
        <div style={S.row}>
          {TABS.map(({ href, label, Icon }, i) => {
            const on = i === index;
            return (
              <button key={href} type="button" role="tab" aria-selected={on} onClick={() => go(i, href)} style={S.tab}>
                <Icon on={on} c={on ? LOOK.icon : color.sub} />
                <span style={{ ...S.label, color: on ? LOOK.label : color.sub }}>{label}</span>
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
  bar: {
    position: 'relative',
    height: TAB_PILL,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'auto',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  pill: { position: 'absolute', top: PAD, left: 0, height: PILL_H, borderRadius: PILL_H / 2, pointerEvents: 'none', transition: SLIDE, willChange: 'transform' },
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
