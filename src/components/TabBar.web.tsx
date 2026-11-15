import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { lensMap } from '../logic/lensMap';
import { color, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

const PAD = 4;
const LENS_H = TAB_PILL - PAD * 2;
/** Rim depth and bend strength of the lens, in px. */
const DEPTH = 12;
const BEND = 14;
/** Faint color fringe at the rim: red and blue bend a little more and less than green. */
const CHROMA = 0.2;

/**
 * Web tab bar in Liquid Glass, built the way Aave describes in "Building glass
 * for the web": the glass is the selection indicator. It is a lens holding a
 * copy of the tabs drawn in their selected style, bent at its rim by an SVG
 * feDisplacementMap from a generated map (src/logic/lensMap.ts), with a faint
 * color fringe and a specular rim on top. It refracts its own content, not the
 * page under it, so it works in Safari and Firefox too. Moving between tabs
 * slides the lens; the map is only rebuilt when the lens changes size.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const index = Math.max(0, TABS.findIndex((t) => t.href === path));

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tabW = width ? (width - PAD * 2) / TABS.length : 0;
  const map = useMemo(() => (tabW ? mapUrl(tabW, LENS_H) : ''), [tabW]);
  // Safari caches filter output by id, so a new map gets a new id.
  const id = useMemo(() => `lens-${Math.round(tabW)}`, [tabW]);

  return (
    <div style={{ ...S.wrap, bottom: pillBottom }}>
      <nav ref={barRef} style={S.bar} aria-label="Tabs">
        <Row active={-1} selected={index} />
        {tabW ? (
          <>
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
            <div aria-hidden style={{ ...S.lens, width: tabW, transform: `translateX(${PAD + index * tabW}px)` }}>
              {/* The lens bends what is inside it, in its own coordinates, so the map always sits under it. */}
              <div style={{ ...S.glass, width: tabW, filter: `url(#${id})` }}>
                {/* A selected-style copy of the row, slid opposite to the lens so it lines up with the real one. */}
                <div style={{ ...S.copy, width: width, transform: `translateX(${-(PAD + index * tabW)}px)` }}>
                  <Row active={index} copy />
                </div>
              </div>
              <div style={S.specular} />
            </div>
          </>
        ) : null}
      </nav>
    </div>
  );
}

function Row({ active, copy, selected }: { active: number; copy?: boolean; selected?: number }) {
  return (
    <div style={{ ...S.row, ...(copy ? S.rowCopy : null) }}>
      {TABS.map(({ href, label, Icon }, i) => {
        const on = i === active;
        return (
          <button
            key={href}
            type="button"
            role="tab"
            aria-selected={copy ? undefined : i === selected}
            tabIndex={copy ? -1 : 0}
            onClick={copy ? undefined : () => router.navigate(href)}
            style={S.tab}
          >
            <Icon on={on} />
            <span style={{ ...S.label, color: on ? color.ink : color.sub }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
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
  img.data.set(lensMap(cw, ch, ch / 2, DEPTH));
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

const S: Record<string, CSSProperties> = {
  wrap: { position: 'absolute', left: 20, right: 20, pointerEvents: 'none' },
  // The bar: frosted, with a light rim. The lens on it is the liquid part.
  bar: {
    position: 'relative',
    height: TAB_PILL,
    borderRadius: TAB_PILL / 2,
    pointerEvents: 'auto',
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
  },
  row: { position: 'absolute', inset: 0, display: 'flex', padding: PAD },
  rowCopy: { position: 'relative', height: TAB_PILL, top: -PAD },
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
  lens: {
    position: 'absolute',
    top: PAD,
    left: 0,
    height: LENS_H,
    borderRadius: LENS_H / 2,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: 'rgba(0,0,0,0.04)',
    transition: 'transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1)',
  },
  glass: { position: 'absolute', top: 0, left: 0, height: LENS_H, overflow: 'hidden' },
  copy: { position: 'absolute', top: 0, left: 0, height: LENS_H, transition: 'transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1)' },
  // Specular rim: light from the top left, as on glass.
  specular: {
    position: 'absolute',
    inset: 0,
    borderRadius: LENS_H / 2,
    boxShadow: 'inset 1.5px 1.5px 0 rgba(255,255,255,0.85), inset -1px -1px 0 rgba(255,255,255,0.35), inset 0 0 12px rgba(255,255,255,0.35)',
    pointerEvents: 'none',
  },
};
