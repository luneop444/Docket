import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createGlass, type Glass } from './glassGL';
import { SPEC } from './glassPicture';
import { BAR_TINT_GL, GLASS_CHROMA, frostSlice, GLASS_RIM, GLASS_STANDIN, glassK, glassReach, mapData, scrollerUnder, sliceMap } from './glassLook';
import { isStale, pictureOf, sliceAt, type PagePicture, type Slice } from './pagePicture';
import { MOVE_EVENT } from './contentMove';

/**
 * The nav bar's liquid glass (TabBar.web.tsx) for small floating pills: the onboarding back
 * button and step dashes. Same renderer (glassGL.ts), same lens map 9-sliced onto each
 * capsule, same bend for its height, colour split, rim shading, tint, frost, edge, lift and
 * rims. The page they bend is one picture of the screen's content, shared with every other
 * glass on it (pagePicture.web.ts), taken once the screen settles; scrolling only moves the
 * glass over it, so nothing is pictured mid-scroll.
 */

interface Rec {
  el: HTMLDivElement;
  cv: HTMLCanvasElement;
  w: number;
  h: number;
  g: Glass;
  /** The slice this glass has loaded, so a new one is only uploaded when it moves to another. */
  slice: Slice | null;
}

interface Group {
  add(r: Omit<Rec, 'g' | 'slice'>): () => void;
  live: boolean;
}

const Ctx = createContext<Group | null>(null);


export function LiquidGroup({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const recs = useRef(new Set<Rec>());
  const pic = useRef<PagePicture | null>(null);
  const content = useRef<HTMLElement | null>(null);
  const [live, setLive] = useState(false);
  const scale = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);

  const frame = useCallback(() => {
    const p = pic.current, el = content.current;
    if (!p || !el || !el.isConnected) return;
    const cr = el.getBoundingClientRect();
    for (const r of recs.current) {
      const b = r.el.getBoundingClientRect();
      const reach = glassReach(r.h);
      const s = sliceAt(p, b.top - cr.top - reach, b.height + reach * 2);
      if (s !== r.slice) {
        r.g.setPage(frostSlice(s, p.scale));
        r.slice = s;
      }
      if (!r.g.ready()) continue;
      const at: [number, number] = [b.left, b.top], size: [number, number] = [b.width, b.height];
      r.g.draw({
        pageOrigin: [cr.left, cr.top + s.top],
        pageSize: [p.width, s.height],
        barOrigin: at,
        barSize: size,
        pillOrigin: at,
        pillSize: size,
        outOrigin: at,
        outSize: size,
        scale,
        barK: glassK(r.h),
        lensK: glassK(r.h),
        chroma: GLASS_CHROMA,
        spec: SPEC,
        barTint: BAR_TINT_GL,
        pillTint: [0, 0, 0, 0],
        isPill: false,
      });
    }
  }, [scale]);

  // Find the content under the group and get its picture (taken once the screen settles).
  const load = useCallback(() => {
    const el = root.current;
    const c = el ? ((scrollerUnder(el, el)?.firstElementChild as HTMLElement | null) ?? null) : null;
    if (!c) return false;
    content.current = c;
    void pictureOf(c).then((p) => {
      if (!p || p.el !== content.current) return;
      pic.current = p;
      for (const r of recs.current) r.slice = null;
      setLive(true);
      requestAnimationFrame(frame);
    });
    return true;
  }, [frame]);

  useEffect(() => {
    let tries = 0;
    let t = 0;
    const go = () => {
      if (!load() && tries++ < 8) t = window.setTimeout(go, 300);
    };
    t = window.setTimeout(go, 300);
    return () => clearTimeout(t);
  }, [load]);

  // A new picture when the content changes size; the old one stays until it's in.
  useEffect(() => {
    const c = content.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (isStale(c)) load();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [live, load]);

  // Every scroll and resize: draw where things are now. Nothing is pictured here.
  useEffect(() => {
    let raf = 0;
    const kick = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          frame();
        });
    };
    document.addEventListener('scroll', kick, { capture: true, passive: true });
    document.addEventListener(MOVE_EVENT, kick);
    window.addEventListener('resize', kick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('scroll', kick, { capture: true });
      document.removeEventListener(MOVE_EVENT, kick);
      window.removeEventListener('resize', kick);
    };
  }, [frame]);

  const [group] = useState<Omit<Group, 'live'>>(() => ({
    add(r) {
      const g = createGlass(r.cv);
      if (!g) return () => {};
      const rec: Rec = { ...r, g, slice: null };
      recs.current.add(rec);
      void mapData(sliceMap(r.w, r.h), r.w, r.h, { x: 0, y: 0, w: r.w, h: r.h }, scale).then((m) => {
        g.setMaps(m, m);
        requestAnimationFrame(() => frame());
      });
      return () => {
        recs.current.delete(rec);
        (r.cv.getContext('webgl') as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
      };
    },
  }));

  return (
    <Ctx.Provider value={{ ...group, live }}>
      <div ref={root} style={S.group}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

/**
 * One capsule of the nav bar's glass, w × h, with its content on top. `on` false: no glass at
 * all, only the content (nothing is under it to set it apart from); it fades in when on.
 */
export function LiquidPill({ w, h, on = true, children }: { w: number; h: number; on?: boolean; children: ReactNode }) {
  const group = useContext(Ctx);
  const el = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const add = group?.add;
  useEffect(() => {
    if (!add || !el.current || !cv.current) return;
    return add({ el: el.current, cv: cv.current, w, h });
  }, [add, w, h]);
  const r = h / 2;
  return (
    <div ref={el} style={{ ...S.pill, width: w, height: h, borderRadius: r }}>
      <div style={{ ...S.glass, borderRadius: r, opacity: on ? 1 : 0 }}>
        {/* A new size gets a new canvas: the old one's WebGL context was let go with its glass. */}
        <canvas key={`${w}x${h}`} ref={cv} aria-hidden style={{ ...S.cv, opacity: group?.live ? 1 : 0 }} />
        <div style={{ ...S.rim, borderRadius: r }} />
      </div>
      <div style={S.content}>{children}</div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  group: { position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'center', pointerEvents: 'none' },
  pill: { position: 'relative', pointerEvents: 'auto', flexShrink: 0 },
  // The glass as one layer, so it can fade in and out whole: stand-in, lens, rims.
  glass: { position: 'absolute', inset: 0, overflow: 'hidden', transition: 'opacity 180ms ease-out', pointerEvents: 'none', ...GLASS_STANDIN },
  cv: { position: 'absolute', inset: 0, width: '100%', height: '100%', transition: 'opacity 120ms', pointerEvents: 'none' },
  rim: { position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: GLASS_RIM },
  content: { position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
