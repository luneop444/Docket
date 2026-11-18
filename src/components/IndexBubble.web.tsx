import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { createGlass, type Glass } from './glassGL';
import { AAVE, CHROMA, SPEC, frosted, roundLensMap } from './glassPicture';
import { scrollerUnder } from './TabBar.web';
import { color, fontFamily } from '../theme/tokens';

export const BUBBLE = 56;
// Clear glass, so the list shows through: white at 12%, and the least frost there is (one pixel), which smooths the rim's squeezed lines.
const TINT: [number, number, number, number] = [1, 1, 1, 0.12];
const FROST = 0.25;
/** Bend at the bubble's size, scaled the way the tab bar's ends are (by height). */
const K = AAVE.x * (BUBBLE / AAVE.h) * 1.8;
/** How far in from the edge the bend reaches, against the tab bar's ends (1). */
const REACH = 1.5;
/** Furthest the rim reads from the bubble: Aave's strongest bend (red 243 of 255). */
const MARGIN = Math.ceil(((243 - 128) / 255) * K) + 8;
/**
 * The list is pictured in overlapping pieces, so wherever a letter jumps to, one piece
 * already holds the bubble and everything its rim reads.
 */
const PIECE = 1400;
const STEP = PIECE - (BUBBLE + MARGIN * 2) - 8;
/** Pictures at 1.5×: sharp enough under the glass, and a long list's pieces fit in a phone's memory. */
const PIC_SCALE = 1.5;

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;

interface Piece {
  top: number;
  height: number;
  page: HTMLCanvasElement;
  w: number;
  h: number;
  anchor: HTMLElement;
  ax: number;
  ay: number;
}

/**
 * The A–Z bubble in the tab bar's liquid glass: a round lens (Aave's rim, turned around
 * the centre) over a picture of the list, drawn every frame while you scrub, so the names
 * bend and split colour at its edge as the list jumps under it.
 *
 * Scrubbing jumps the list hundreds of points a letter, faster than a picture can be taken,
 * so the whole list is pictured ahead of time in pieces, nearest first, as soon as the index
 * shows. Until the piece under the bubble is in, the bubble is the same glass in CSS.
 */
export function IndexBubble({ letter, active, warm }: { letter: string; active: boolean; warm: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const glass = useRef<Glass | null>(null);
  const pieces = useRef(new Map<number, Piece>());
  const shown = useRef<Piece | null>(null);
  const queue = useRef<number[]>([]);
  const busy = useRef(false);
  const content = useRef<HTMLElement | null>(null);
  const listH = useRef(0);
  const scale = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);

  useEffect(() => {
    const c = cv.current;
    if (!c || glass.current) return;
    try {
      const g = createGlass(c);
      if (!g) return;
      glass.current = g;
      void roundLensMap(BUBBLE, scale, AAVE, REACH).then((m) => g.setMaps(m, m));
    } catch {
      glass.current = null;
    }
  }, [scale]);

  /** Piece i of the list: PIECE points from i × STEP down. */
  const shoot = useCallback(async (i: number, list: HTMLElement): Promise<Piece | null> => {
    const el = box.current;
    if (!el) return null;
    const own = el.closest('[data-letter-index]');
    const cr0 = list.getBoundingClientRect();
    const top = i * STEP;
    const height = Math.min(PIECE, list.scrollHeight - top);
    if (height <= 0) return null;
    // Something inside the piece to measure it by, in the page and in html2canvas's copy.
    let anchor: HTMLElement | null = null;
    for (const d of Array.from(list.querySelectorAll<HTMLElement>('div'))) {
      if (own && own.contains(d)) continue;
      const b = d.getBoundingClientRect();
      const y = b.top - cr0.top;
      if (b.height > 0 && y >= top && y < top + height) {
        anchor = d;
        break;
      }
    }
    if (!anchor) return null;
    const a0 = anchor;
    const anchorY = a0.getBoundingClientRect().top - cr0.top;
    list.setAttribute('data-glass-root', '');
    a0.setAttribute('data-glass-anchor', '');
    let shift = 0;
    const { default: html2canvas } = (await import('html2canvas')) as unknown as { default: Html2Canvas };
    const shot = await html2canvas(list, {
      scale: PIC_SCALE,
      backgroundColor: color.bg,
      logging: false,
      ignoreElements: (e: Element) => {
        if (own && own.contains(e)) return true;
        if (!list.contains(e) || e === list || e.contains(a0)) return false;
        const b = e.getBoundingClientRect();
        return b.bottom - cr0.top < top || b.top - cr0.top > top + height;
      },
      onclone: (doc: Document) => {
        const root = doc.querySelector('[data-glass-root]'), a = doc.querySelector('[data-glass-anchor]');
        if (root && a) shift = anchorY - (a.getBoundingClientRect().top - root.getBoundingClientRect().top);
      },
    }).catch(() => null);
    a0.removeAttribute('data-glass-anchor');
    list.removeAttribute('data-glass-root');
    if (!shot) return null;
    const ar = a0.getBoundingClientRect();
    return {
      top,
      height,
      page: FROST > 0 ? frosted(shot, PIC_SCALE, FROST) : shot,
      w: shot.width / PIC_SCALE,
      h: shot.height / PIC_SCALE,
      anchor: a0,
      ax: ar.left - list.getBoundingClientRect().left,
      ay: anchorY - shift,
    };
  }, []);

  /** Take the queued pieces one at a time. */
  const work = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (queue.current.length && content.current) {
        const i = queue.current.shift()!;
        if (pieces.current.has(i)) continue;
        const p = await shoot(i, content.current);
        if (p) pieces.current.set(i, p);
        // Let the page breathe between pieces.
        await new Promise((r) => setTimeout(r, 30));
      }
    } finally {
      busy.current = false;
    }
  }, [shoot]);

  /** Queue every piece not yet taken, nearest `y` (points down the list) first. */
  const plan = useCallback(
    (y: number) => {
      const list = content.current;
      if (!list) return;
      const n = Math.max(1, Math.ceil((list.scrollHeight - (PIECE - STEP)) / STEP));
      const here = Math.max(0, Math.min(n - 1, Math.floor(y / STEP)));
      const left = Array.from({ length: n }, (_, i) => i).filter((i) => !pieces.current.has(i));
      queue.current = left.sort((a, b) => Math.abs(a - here) - Math.abs(b - here));
      void work();
    },
    [work],
  );

  // When the index shows, start picturing the list.
  useEffect(() => {
    if (!warm) return;
    const t = setTimeout(() => {
      const el = box.current;
      const list = el ? ((scrollerUnder(el)?.firstElementChild as HTMLElement | null) ?? null) : null;
      if (!el || !list) return;
      // A different list, or the same one grown or filtered: picture it again.
      if (list !== content.current || list.scrollHeight !== listH.current) {
        content.current = list;
        listH.current = list.scrollHeight;
        pieces.current.clear();
        shown.current = null;
      }
      plan(el.getBoundingClientRect().top - list.getBoundingClientRect().top);
    }, 300);
    return () => clearTimeout(t);
  }, [warm, plan]);

  const frame = useCallback(() => {
    const g = glass.current, el = box.current, list = content.current, c = cv.current;
    if (!g || !el || !list || !c) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const y = r.top - list.getBoundingClientRect().top;
    // The piece that holds the bubble and all its rim reads; at the list's ends, the bubble alone.
    let p: Piece | null = null;
    for (const q of pieces.current.values()) if (y - MARGIN >= q.top && y + BUBBLE + MARGIN <= q.top + q.height) p = q;
    if (!p) for (const q of pieces.current.values()) if (y >= q.top && y + BUBBLE <= q.top + q.height) p = q;
    if (!p) {
      c.style.opacity = '0';
      // Jumped to a part not yet pictured: that part goes first.
      if (queue.current[0] !== Math.floor(y / STEP)) plan(y);
      return;
    }
    if (shown.current !== p) {
      g.setPage(p.page);
      shown.current = p;
    }
    const ar = p.anchor.isConnected ? p.anchor.getBoundingClientRect() : null;
    if (!g.ready() || !ar || ar.height === 0) {
      c.style.opacity = '0';
      return;
    }
    const at: [number, number] = [r.left, r.top], size: [number, number] = [r.width, r.height];
    g.draw({
      pageOrigin: [ar.left - p.ax, ar.top - p.ay],
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
    c.style.opacity = '1';
  }, [scale, plan]);

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
  // Stand-in glass until the piece under it is pictured: the same tint and frost. No shadow.
  bubble: {
    position: 'relative',
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
    background: `rgba(255,255,255,${TINT[3]})`,
    backdropFilter: `blur(${FROST}px)`,
    WebkitBackdropFilter: `blur(${FROST}px)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cv: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' },
  // The edge, lit along the top-left and in shade along the bottom-right.
  rim: {
    position: 'absolute',
    inset: 0,
    borderRadius: BUBBLE / 2,
    pointerEvents: 'none',
    boxShadow:
      'inset 1.5px 1.5px 0.5px -0.5px rgba(255,255,255,1), inset -1px -1px 1px -0.5px rgba(0,0,0,0.12), inset 0 0 0 0.5px rgba(0,0,0,0.10)',
  },
  letter: { position: 'relative', fontFamily: fontFamily.semibold, fontSize: 28, lineHeight: '28px', color: color.ink },
};
