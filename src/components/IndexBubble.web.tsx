import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createGlass, type Glass } from './glassGL';
import { AAVE, CHROMA, SPEC, frosted, roundLensMap } from './glassPicture';
import { scrollerUnder } from './TabBar.web';
import { color, fontFamily } from '../theme/tokens';

export const BUBBLE = 56;
/** The tab bar's glass: white at 62%, 1px of frost. */
const TINT: [number, number, number, number] = [1, 1, 1, 0.62];
const FROST = 1;
/** Bend at the bubble's size, scaled the way the tab bar's ends are (by height). */
const K = AAVE.x * (BUBBLE / AAVE.h);

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;

interface Picture {
  el: HTMLElement;
  bandTop: number;
  height: number;
  w: number;
  h: number;
  anchor: HTMLElement;
  ax: number;
  ay: number;
}

/**
 * The A–Z bubble in the tab bar's liquid glass: a round lens (Aave's rim, turned around
 * the centre) over a picture of the list, drawn live every frame while you scrub, so the
 * names bend and split colour at its edge as the list jumps under it.
 */
export function IndexBubble({ letter, active, warm }: { letter: string; active: boolean; warm: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const glass = useRef<Glass | null>(null);
  const pic = useRef<Picture | null>(null);
  const busy = useRef(false);
  const lastShot = useRef(0);
  const [live, setLive] = useState(false);
  const scale = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);

  useEffect(() => {
    const c = cv.current;
    if (!c || glass.current) return;
    try {
      const g = createGlass(c);
      if (!g) return;
      glass.current = g;
      void roundLensMap(BUBBLE, scale, AAVE).then((m) => g.setMaps(m, m));
    } catch {
      glass.current = null;
    }
  }, [scale]);

  const take = useRef<() => void>(() => {});

  const frame = useCallback(() => {
    const g = glass.current, p = pic.current, el = box.current;
    if (!g || !p || !el || !g.ready()) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const ar = p.anchor.isConnected ? p.anchor.getBoundingClientRect() : null;
    const cr = p.el.getBoundingClientRect();
    const origin: [number, number] = ar && ar.height > 0 ? [ar.left - p.ax, ar.top - p.ay] : [cr.left, cr.top + p.bandTop];
    const at: [number, number] = [r.left, r.top], size: [number, number] = [r.width, r.height];
    g.draw({
      pageOrigin: origin,
      pageSize: [p.w, p.h],
      barOrigin: at,
      barSize: size,
      pillOrigin: at,
      pillSize: size,
      outOrigin: at,
      outSize: size,
      scale,
      barK: [K, K],
      lensK: [K, K],
      chroma: CHROMA as [number, number, number],
      spec: SPEC,
      barTint: TINT,
      pillTint: [0, 0, 0, 0],
      isPill: false,
    });
    // Jumping to a far letter moves the list out of the picture: take the part now under it.
    const y = r.top - cr.top;
    if (!busy.current && (y - 24 < p.bandTop || y + BUBBLE + 24 > p.bandTop + p.height) && performance.now() - lastShot.current > 300) take.current();
  }, [scale]);

  const picture = useCallback(async () => {
    const el = box.current;
    if (!el || !glass.current || busy.current) return;
    busy.current = true;
    lastShot.current = performance.now();
    try {
      const r = el.getBoundingClientRect();
      const scroller = scrollerUnder(el);
      const content = (scroller?.firstElementChild as HTMLElement | null) ?? null;
      if (!content) return;
      const own = el.closest('[data-letter-index]');
      const cr0 = content.getBoundingClientRect();
      const band = Math.round(window.innerHeight * 1.2);
      const top = Math.max(0, Math.min(content.scrollHeight - band, r.top - cr0.top - band / 2));
      const hit = document
        .elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        .find((e) => content.contains(e) && e !== content && !(own && own.contains(e))) as HTMLElement | undefined;
      const anchor = hit ?? content;
      const anchorY = anchor.getBoundingClientRect().top - cr0.top;
      content.setAttribute('data-glass-root', '');
      anchor.setAttribute('data-glass-anchor', '');
      let shift = 0;
      const { default: html2canvas } = (await import('html2canvas')) as unknown as { default: Html2Canvas };
      const shot = await html2canvas(content, {
        scale,
        backgroundColor: color.bg,
        logging: false,
        ignoreElements: (e: Element) => {
          if (own && own.contains(e)) return true;
          if (!content.contains(e) || e === content || e.contains(anchor)) return false;
          const b = e.getBoundingClientRect();
          return b.bottom - cr0.top < top || b.top - cr0.top > top + band;
        },
        onclone: (doc: Document) => {
          const root = doc.querySelector('[data-glass-root]'), a = doc.querySelector('[data-glass-anchor]');
          if (root && a) shift = anchorY - (a.getBoundingClientRect().top - root.getBoundingClientRect().top);
        },
      }).catch(() => null);
      anchor.removeAttribute('data-glass-anchor');
      content.removeAttribute('data-glass-root');
      if (!shot || !glass.current) return;
      glass.current.setPage(frosted(shot, scale, FROST));
      const ar0 = anchor.getBoundingClientRect();
      pic.current = {
        el: content,
        bandTop: top,
        height: Math.min(band, content.scrollHeight - top),
        w: shot.width / scale,
        h: shot.height / scale,
        anchor,
        ax: ar0.left - cr0.left,
        ay: anchorY - shift,
      };
      setLive(true);
    } finally {
      busy.current = false;
    }
  }, [scale]);
  useEffect(() => {
    take.current = () => void picture();
  }, [picture]);

  // Take the picture as soon as the index shows, so the glass is ready before the first touch.
  useEffect(() => {
    if (!warm || pic.current) return;
    const t = setTimeout(() => take.current(), 300);
    return () => clearTimeout(t);
  }, [warm]);

  // While you scrub: a picture if there isn't one, then a frame every frame.
  useEffect(() => {
    if (!active) return;
    if (!pic.current) take.current();
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
      <canvas ref={cv} aria-hidden style={{ ...S.cv, opacity: live ? 1 : 0 }} />
      <div style={S.rim} />
      <span style={S.letter}>{letter}</span>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  // Stand-in glass until the picture is in: the same tint and frost as the tab bar.
  bubble: {
    position: 'relative',
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.62)',
    backdropFilter: `blur(${FROST}px)`,
    WebkitBackdropFilter: `blur(${FROST}px)`,
    boxShadow: '0 0 0 0.5px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cv: { position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'opacity 120ms', pointerEvents: 'none' },
  // Glass over a plain white page has nothing to bend, so its edge is what shows it's glass:
  // the rim darkens as it curves away (more glass to look through), lit along the top-left
  // and in shade along the bottom-right, as Apple's glass is over a white page.
  rim: {
    position: 'absolute',
    inset: 0,
    borderRadius: BUBBLE / 2,
    pointerEvents: 'none',
    background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(20,24,30,0.07) 86%, rgba(20,24,30,0.13) 100%)',
    boxShadow:
      'inset 1.5px 1.5px 0.5px -0.5px rgba(255,255,255,1), inset -1px -1px 1px -0.5px rgba(0,0,0,0.12), inset 0 0 0 0.5px rgba(0,0,0,0.10)',
  },
  letter: { position: 'relative', fontFamily: fontFamily.semibold, fontSize: 28, lineHeight: '28px', color: color.ink },
};
