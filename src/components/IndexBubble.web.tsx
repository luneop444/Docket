import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { createGlass, type Glass } from './glassGL';
import { SPEC } from './glassPicture';
import { BAR_TINT_GL, GLASS_CHROMA, GLASS_RIM, GLASS_STANDIN, frostSlice, glassK, glassReach, mapData, scrollerUnder, sliceMap } from './glassLook';
import { isStale, pictureOf, sliceAt, type PagePicture, type Slice } from './pagePicture';
import { color, fontFamily } from '../theme/tokens';

export const BUBBLE = 56;
/** Bend for glass this tall, as the nav bar and the onboarding pills bend for theirs. */
const K = glassK(BUBBLE);
/** Furthest the rim reads from the bubble. */
const REACH = glassReach(BUBBLE);

/**
 * The A–Z bubble in the nav bar's liquid glass, the very same as the bar and the onboarding
 * pills (glassLook.ts): its lens map fitted to a 56 circle, the same bend for its height,
 * colour split, rim shading, 62% white, frost, edge, lift and rims. Drawn every frame while
 * you scrub, so the names bend and split colour at its edge as the list jumps under it.
 *
 * Scrubbing jumps the list hundreds of points a letter, faster than a picture can be taken,
 * so it reads the screen's one picture of the whole list (pagePicture.ts), shared with the
 * header glass and taken once the screen settles. Until it's in, the bubble is the same
 * glass in CSS.
 */
export function IndexBubble({ letter, active, warm }: { letter: string; active: boolean; warm: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const glass = useRef<Glass | null>(null);
  const pic = useRef<PagePicture | null>(null);
  const shown = useRef<Slice | null>(null);
  const content = useRef<HTMLElement | null>(null);
  const scale = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);

  useEffect(() => {
    const c = cv.current;
    if (!c || glass.current) return;
    try {
      const g = createGlass(c);
      if (!g) return;
      glass.current = g;
      void mapData(sliceMap(BUBBLE, BUBBLE), BUBBLE, BUBBLE, { x: 0, y: 0, w: BUBBLE, h: BUBBLE }, scale).then((m) => g.setMaps(m, m));
    } catch {
      glass.current = null;
    }
  }, [scale]);

  // When the index shows, get the list's picture (shared, and taken once nothing scrolls).
  useEffect(() => {
    if (!warm) return;
    const t = setTimeout(() => {
      const el = box.current;
      const list = el ? ((scrollerUnder(el)?.firstElementChild as HTMLElement | null) ?? null) : null;
      if (!list) return;
      content.current = list;
      void pictureOf(list).then((p) => {
        if (p && p.el === content.current) {
          pic.current = p;
          shown.current = null;
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [warm]);

  const frame = useCallback(() => {
    const g = glass.current, el = box.current, list = content.current, c = cv.current;
    if (!g || !el || !list || !c) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const lr = list.getBoundingClientRect();
    const y = r.top - lr.top;
    const p = pic.current;
    // The list changed size (a search): its new picture comes once nothing scrolls.
    if (isStale(list)) void pictureOf(list).then((q) => q && q.el === content.current && ((pic.current = q), (shown.current = null)));
    if (!p) {
      c.style.opacity = '0';
      return;
    }
    // The slice that holds the bubble and everything its rim reads.
    const sl = sliceAt(p, y - REACH, BUBBLE + REACH * 2);
    if (shown.current !== sl) {
      g.setPage(frostSlice(sl, p.scale));
      shown.current = sl;
    }
    if (!g.ready()) {
      c.style.opacity = '0';
      return;
    }
    const at: [number, number] = [r.left, r.top], size: [number, number] = [r.width, r.height];
    g.draw({
      pageOrigin: [lr.left, lr.top + sl.top],
      pageSize: [p.width, sl.height],
      barOrigin: at,
      barSize: size,
      pillOrigin: at,
      pillSize: size,
      outOrigin: at,
      outSize: size,
      scale,
      barK: K,
      lensK: K,
      chroma: GLASS_CHROMA,
      spec: SPEC,
      barTint: BAR_TINT_GL,
      pillTint: [0, 0, 0, 0],
      isPill: false,
    });
    c.style.opacity = '1';
  }, [scale]);

  // While you scrub, a frame every frame.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      frame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, frame]);

  return (
    <div ref={box} style={S.bubble}>
      <canvas ref={cv} aria-hidden style={S.cv} />
      <div style={S.rim} />
      <span style={S.letter}>{letter}</span>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  // Stand-in until the list is pictured: the nav bar's glass in CSS (tint, frost, edge, lift).
  bubble: {
    position: 'relative',
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
    ...GLASS_STANDIN,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cv: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' },
  rim: { position: 'absolute', inset: 0, borderRadius: BUBBLE / 2, pointerEvents: 'none', boxShadow: GLASS_RIM },
  letter: { position: 'relative', fontFamily: fontFamily.semibold, fontSize: 28, lineHeight: '28px', color: color.ink },
};
