import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BackdropCtx } from './backdrop';
import { glassEdge, glassLift, radius } from '../theme/tokens';
import { createGlass, type Glass } from './glassGL';
import { BAR_TINT_GL, FROST, GLASS_CHROMA, GLASS_RIM, glassK, mapData } from './glassLook';
import { frosted, SPEC } from './glassPicture';
import { squircleExtent, squirclePath } from '../logic/squircle';

type Html2Canvas = (el: HTMLElement, o: Record<string, unknown>) => Promise<HTMLCanvasElement>;

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
 * The rim the sheet bends across, as if it were glass this tall. Each pill bends for its own
 * height (glassK(h)); the sheet is too tall for that (380 would pull the page 150 points in),
 * so it bends like 120-point glass: about 47 points at the very edge, across a 50-point rim.
 */
const RIM_H = 120;
const BEZEL_PX = 0.42 * RIM_H;

export function LiquidSheet({ children, tint = BAR_TINT_GL[3] }: { children: ReactNode; tint?: number }) {
  const backdrop = useContext(BackdropCtx);
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
        pageOrigin: [p.left, p.top],
        pageSize: [p.width, p.height],
        barOrigin: at,
        barSize: sz,
        pillOrigin: at,
        pillSize: sz,
        outOrigin: at,
        outSize: sz,
        scale,
        barK: glassK(RIM_H),
        lensK: glassK(RIM_H),
        chroma: GLASS_CHROMA,
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
    const t = window.setTimeout(async () => {
      const { default: html2canvas } = (await import('html2canvas')) as unknown as { default: Html2Canvas };
      const shot = await html2canvas(bd, { scale, backgroundColor: '#0B0B0C', logging: false, useCORS: true, ignoreElements: (e: Element) => (e as HTMLElement).dataset?.noglass === '1' }).catch(() => null);
      if (!shot || gone) return;
      g.setPage(frosted(shot, scale, FROST));
      setLive(true);
      follow(performance.now() + 900);
    }, 450);
    const kick = () => draw();
    window.addEventListener('resize', kick);
    return () => {
      gone = true;
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', kick);
      (c.getContext('webgl') as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [backdrop, size, tint]);

  return (
    <div style={S.wrap}>
      <div ref={box} style={S.box} data-squircle="own">
        {/* Stand-in while the picture loads, or where WebGL can't run: the same tint, flat. */}
        <div style={{ ...S.fill, background: `rgba(255,255,255,${tint})`, opacity: live ? 0 : 1 }} />
        <canvas key={size ? `${size.w}x${size.h}` : 'none'} ref={cv} aria-hidden style={{ ...S.fill, opacity: live ? 1 : 0 }} />
        <div style={{ ...S.fill, boxShadow: GLASS_RIM, borderRadius: radius.sheet }} />
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
  const R = r2;
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
  wrap: { position: 'relative', borderRadius: radius.sheet, boxShadow: `${glassEdge}, ${glassLift}` },
  box: { position: 'relative', overflow: 'hidden', borderRadius: radius.sheet },
  fill: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transition: 'opacity 160ms' },
  content: { position: 'relative', padding: 20, display: 'flex', flexDirection: 'column' },
};
