import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createGlass, type Glass } from './glassGL';
import { SPEC } from './glassPicture';
import { BAR_TINT_GL, chromaTimes, frostSlice, GLASS_RIM, GLASS_STANDIN, glassK, glassReach, lensMap, mapData, rimWith, scrollerUnder } from './glassLook';
import { forget, isStale, pictureOf, sliceAt, type PagePicture, type Slice } from './pagePicture';
import { MOVE_EVENT } from './contentMove';
import { BackdropCtx, GlassTuneCtx, REPICTURE_EVENT, sceneShift } from './backdrop';

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
  /** Its own white, when the screen adapts it, and where that was measured. */
  tint?: { at: string; t: number };
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
  const scene = useRef(false);
  const [live, setLive] = useState(false);
  const scale = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const tune = useContext(GlassTuneCtx);

  const frame = useCallback(() => {
    const p = pic.current, el = content.current;
    if (!p || !el || !el.isConnected) return;
    const cr = el.getBoundingClientRect();
    for (const r of recs.current) {
      const b = r.el.getBoundingClientRect();
      const reach = glassReach(r.h);
      const s = sliceAt(p, b.top - cr.top - reach, b.height + reach * 2);
      if (s !== r.slice) {
        r.g.setPage(frostSlice(s, p.scale, tune.frost ?? undefined));
        r.slice = s;
      }
      if (!r.g.ready()) continue;
      const at: [number, number] = [b.left, b.top], size: [number, number] = [b.width, b.height];
      // Over a scene, its picture is at rest; slide it to where the scene is now.
      const sx = scene.current ? sceneShift.x : 0, sy = scene.current ? sceneShift.y : 0;
      r.g.draw({
        pageOrigin: [cr.left + sx, cr.top + s.top + sy],
        pageSize: [p.width, s.height],
        barOrigin: at,
        barSize: size,
        pillOrigin: at,
        pillSize: size,
        outOrigin: at,
        outSize: size,
        scale,
        barK: [glassK(r.h)[0] * tune.bend, glassK(r.h)[1] * tune.bend],
        lensK: [glassK(r.h)[0] * tune.bend, glassK(r.h)[1] * tune.bend],
        chroma: chromaTimes(tune.split),
        spec: SPEC,
        barTint: tune.adapt
          ? [BAR_TINT_GL[0], BAR_TINT_GL[1], BAR_TINT_GL[2], whiteFor(r, s, p.scale, b.left - cr.left - sx, b.top - cr.top - s.top - sy, b.width, b.height, tune.adapt)]
          : tune.tint == null
            ? BAR_TINT_GL
            : [BAR_TINT_GL[0], BAR_TINT_GL[1], BAR_TINT_GL[2], tune.tint],
        pillTint: [0, 0, 0, 0],
        isPill: false,
      });
    }
  }, [scale, tune]);

  // Find the content under the group and get its picture (taken once the screen settles).
  // Over a photo (the scanner), the glass bends the photo; otherwise the page scrolling under it.
  const backdrop = useContext(BackdropCtx);
  const load = useCallback(() => {
    const el = root.current;
    const c = (backdrop ? backdrop.current : null) ?? (el ? ((scrollerUnder(el, el)?.firstElementChild as HTMLElement | null) ?? null) : null);
    if (!c) return false;
    content.current = c;
    scene.current = !!backdrop && backdrop.current === c;
    void pictureOf(c, null, backdrop && backdrop.current === c ? 'rest' : 'page').then((p) => {
      if (!p || p.el !== content.current) return;
      pic.current = p;
      for (const r of recs.current) r.slice = null;
      setLive(true);
      requestAnimationFrame(frame);
    });
    return true;
  }, [frame, backdrop]);

  useEffect(() => {
    let tries = 0;
    let t = 0;
    const go = () => {
      if (!load() && tries++ < 8) t = window.setTimeout(go, 300);
    };
    t = window.setTimeout(go, 300);
    return () => clearTimeout(t);
  }, [load]);

  // A new picture when the backdrop has moved and settled (backdrop.ts); the old one stays
  // until it's in.
  useEffect(() => {
    if (!backdrop) return;
    const again = () => {
      const c = content.current;
      if (c) forget(c);
      load();
    };
    document.addEventListener(REPICTURE_EVENT, again);
    return () => document.removeEventListener(REPICTURE_EVENT, again);
  }, [backdrop, load]);

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
      void mapData(lensMap(r.w, r.h, tune.bezel ?? undefined), r.w, r.h, { x: 0, y: 0, w: r.w, h: r.h }, scale).then((m) => {
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
  const tune = useContext(GlassTuneCtx);
  const tuned: CSSProperties = {
    ...(tune.tint == null ? null : { background: `rgba(255,255,255,${tune.tint})` }),
    ...(tune.lift == null ? null : { boxShadow: `0 0 0 0.5px rgba(0,0,0,0.10), ${tune.lift}` }),
  };
  return (
    <div ref={el} style={{ ...S.pill, width: w, height: h, borderRadius: r }}>
      <div style={{ ...S.glass, ...tuned, borderRadius: r, opacity: on ? 1 : 0 }}>
        {/* A new size gets a new canvas: the old one's WebGL context was let go with its glass. */}
        <canvas key={`${w}x${h}`} ref={cv} aria-hidden style={{ ...S.cv, opacity: group?.live ? 1 : 0 }} />
        <div style={{ ...S.rim, ...(tune.rimShade == null ? null : { boxShadow: rimWith(tune.rimShade) }), borderRadius: r }} />
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

/** Relative luminance of an sRGB grey or colour, 0 to 1. */
const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const lumOf = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const hexLum = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return lumOf((n >> 16) & 255, (n >> 8) & 255, n & 255);
};
const probe = typeof document === 'undefined' ? null : document.createElement('canvas');

/**
 * The least white this glass needs. It looks at the picture under it, takes the darkest tenth
 * (a label can sit anywhere on the glass), and finds the white that lifts that to 4.5:1 against
 * the ink, the same mix the shader does: white over the backdrop at strength t. Measured again
 * only when the glass sits over a different part of the picture.
 */
function whiteFor(r: Rec, s: Slice, scale: number, x: number, y: number, w: number, h: number, a: { ink: string; min: number; max: number }) {
  const at = `${s.canvas.width}:${s.top}:${Math.round(x / 4)}:${Math.round(y / 4)}:${Math.round(w)}`;
  if (r.tint && r.tint.at === at) return r.tint.t;
  let t = a.max;
  const g = probe?.getContext('2d', { willReadFrequently: true });
  if (probe && g) {
    const PW = 32, PH = 12;
    probe.width = PW;
    probe.height = PH;
    g.drawImage(s.canvas, x * scale, y * scale, w * scale, h * scale, 0, 0, PW, PH);
    const d = g.getImageData(0, 0, PW, PH).data;
    const L: number[] = [];
    for (let i = 0; i < d.length; i += 4) L.push(lumOf(d[i], d[i + 1], d[i + 2]));
    L.sort((m, n) => m - n);
    const dark = L[Math.floor(L.length * 0.1)];
    const need = 4.5 * (hexLum(a.ink) + 0.05) - 0.05;
    // The shader mixes in sRGB: out = t·255 + (1 − t)·bg. Solve for t on the grey channel.
    const toS = (l: number) => 255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
    const bg = toS(dark), goal = toS(need);
    t = Math.min(a.max, Math.max(a.min, bg >= goal ? 0 : (goal - bg) / (255 - bg)));
  }
  r.tint = { at, t };
  return t;
}
