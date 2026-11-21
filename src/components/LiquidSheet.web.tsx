import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BackdropCtx, RiseCtx, SCAN_BEND, SCAN_SPLIT } from './backdrop';
import { glassEdge, glassLift, radius } from '../theme/tokens';
import { createGlass, type Glass } from './glassGL';
import { BAR_TINT_GL, BEZEL, chromaTimes, FROST, GLASS_RIM, glassK, mapData } from './glassLook';
import { forget, pictureOf, sliceAt } from './pagePicture';
import { frosted, SPEC } from './glassPicture';
import { squircleExtent, squirclePath } from '../logic/squircle';


export { BackdropCtx };

/**
 * The tab bar's liquid glass (glassGL.ts), shaped as a sheet: the same shader, tint, frost,
 * colour split, highlight, edge, lift and rims. Only the lens is drawn for a 24 squircle
 * instead of a capsule, and its rim bends as much as the nav bar's does (the bend for a bar
 * the nav bar's height, not for the sheet's: a 400-point-tall bend would warp the whole page).
 *
 * The page it bends is one picture of the photo behind it, taken once the sheet has risen.
 */
/**
 * The card's glass is the system's, read at the nav bar's scale (21 Nov, after the heavier
 * tunings turned the whole card into a lens): the rim bends across the nav bar's own rim
 * width (BEZEL of its 64-point glass, about 27 points) by the nav bar's own amount, so the
 * edge reads like every other glass edge and the middle stays a calm, flat pane. Tint, lift,
 * rims and colour split are the system's.
 */
const RIM_H = 64;
const BEZEL_PX = BEZEL * RIM_H;
const SHEET_BEND = SCAN_BEND;
const SHEET_SPLIT = SCAN_SPLIT;
export const SHEET_TINT = BAR_TINT_GL[3];
const SHEET_LIFT = glassLift;
const SHEET_RIM = GLASS_RIM;
const sheetK = (): [number, number] => {
  const [k] = glassK(RIM_H);
  return [k * SHEET_BEND, k * SHEET_BEND];
};
const SHEET_CHROMA = chromaTimes(SHEET_SPLIT);

export function LiquidSheet({ children, tint = SHEET_TINT }: { children: ReactNode; tint?: number }) {
  const backdrop = useContext(BackdropCtx);
  const rise = useContext(RiseCtx);
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current, c = cv.current, bd = backdrop?.current;
    if (!el || !c || !bd || !size) return;
    const g: Glass | null = createGlass(c);
    if (!g) return;
    let gone = false;
    let raf = 0;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const draw = () => {
      if (gone || !g.ready()) return;
      const b = el.getBoundingClientRect(), p = bd.getBoundingClientRect();
      const at: [number, number] = [b.left, b.top], sz: [number, number] = [b.width, b.height];
      g.draw({
        pageOrigin: [p.left, p.top + top],
        pageSize: [p.width, tall],
        barOrigin: at,
        barSize: sz,
        pillOrigin: at,
        pillSize: sz,
        outOrigin: at,
        outSize: sz,
        scale,
        barK: sheetK(),
        lensK: sheetK(),
        chroma: SHEET_CHROMA,
        spec: SPEC,
        barTint: [BAR_TINT_GL[0], BAR_TINT_GL[1], BAR_TINT_GL[2], tint],
        pillTint: [0, 0, 0, 0],
        isPill: false,
      });
    };
    // Follow the sheet while it rises, then hold still.
    const follow = (until: number) => {
      draw();
      if (performance.now() < until) raf = requestAnimationFrame(() => follow(until));
    };
    void mapData(sheetLens(size.w, size.h), size.w, size.h, { x: 0, y: 0, w: size.w, h: size.h }, scale).then((m) => {
      if (gone) return;
      g.setMaps(m, m);
    });
    // The same picture of the photo the pills bend (pagePicture), taken once the screen settles.
    let top = 0, tall = 1;
    // A fresh picture: the page now shows the lines it read, which the earlier one didn't.
    forget(bd);
    // After the scene has settled under where the card will sit (Scanner drops it ~0.5 s).
    const wait = new Promise((ok) => setTimeout(ok, 560));
    void wait.then(() => pictureOf(bd)).then((p) => {
      if (!p || gone) return;
      const sl = sliceAt(p, 0, p.slices[0]?.height ?? 0);
      top = sl.top;
      tall = sl.height;
      g.setPage(frosted(sl.canvas, p.scale, FROST));
      setLive(true);
      // Now the card can rise, with its glass drawn the whole way up.
      rise?.();
      follow(performance.now() + 1600);
    });
    const kick = () => draw();
    window.addEventListener('resize', kick);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', kick);
      (c.getContext('webgl') as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [backdrop, size, tint, rise]);

  return (
    <div style={S.wrap}>
      <div ref={box} style={S.box} data-squircle="own">
        {/* Stand-in while the picture loads, or where WebGL can't run: the same tint, flat. */}
        <div style={{ ...S.fill, background: `rgba(255,255,255,${tint})`, opacity: live ? 0 : 1 }} />
        <canvas key={size ? `${size.w}x${size.h}` : 'none'} ref={cv} aria-hidden style={{ ...S.fill, opacity: live ? 1 : 0 }} />
        <div style={{ ...S.fill, boxShadow: SHEET_RIM, borderRadius: radius.sheet }} />
        <div style={S.content}>{children}</div>
      </div>
    </div>
  );
}

/**
 * The lens for a w × h squircle sheet: the capsule lens's falloff (glassLook lensMap), measured
 * from the squircle's own edge, across a rim the nav bar's width.
 */
function sheetLens(w: number, h: number): Promise<string> {
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  const r2 = squircleExtent(radius.sheet, W, H);
  // Distance to the edge, from a squircle mask: rasterise the path, then walk inward.
  const mc = document.createElement('canvas');
  mc.width = W;
  mc.height = H;
  const mx = mc.getContext('2d')!;
  mx.fill(new Path2D(squirclePath(W, H, [r2, r2, r2, r2])));
  const inside = mx.getImageData(0, 0, W, H).data;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const B = BEZEL_PX;
  // The normal comes from the rim's own width (not the corner's), so it turns smoothly round
  // the corners: no seams along the diagonals.
  const R = Math.min(Math.max(r2, B), W / 2, H / 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let r = 128, g = 128, b = 128;
      if (inside[i + 3] > 127) {
        // The nearest edge point: straight edges away from the corners, the corner's curve near them.
        const px = x + 0.5, py = y + 0.5;
        const cx = Math.min(Math.max(px, R), W - R), cy = Math.min(Math.max(py, R), H - R);
        let dx = px - cx, dy = py - cy;
        let d = Math.hypot(dx, dy);
        let into: number;
        if (d > 0.001) into = R - d;
        else {
          // In a straight stretch: the nearest side.
          const ds = [px, W - px, py, H - py];
          const k = ds.indexOf(Math.min(...ds));
          into = ds[k];
          dx = k === 0 ? -1 : k === 1 ? 1 : 0;
          dy = k === 2 ? -1 : k === 3 ? 1 : 0;
          d = 1;
        }
        const t = Math.max(0, 1 - Math.max(0, into) / B);
        const m = 0.9 * t * t;
        r = 128 - (dx / d) * m * 127.5;
        g = 128 - (dy / d) * m * 127.5;
        b = 128 + 15 * Math.max(0, 1 - Math.max(0, into) / 3);
      }
      img.data[i] = Math.round(r);
      img.data[i + 1] = Math.round(g);
      img.data[i + 2] = Math.round(b);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return Promise.resolve(c.toDataURL());
}

const S: Record<string, CSSProperties> = {
  // Edge and lift outside the clip, so the squircle clip doesn't cut the shadow off.
  wrap: { position: 'relative', borderRadius: radius.sheet, boxShadow: `${glassEdge}, ${SHEET_LIFT}` },
  box: { position: 'relative', overflow: 'hidden', borderRadius: radius.sheet },
  fill: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transition: 'opacity 160ms' },
  content: { position: 'relative', padding: 20, display: 'flex', flexDirection: 'column' },
};
