import { useEffect, useRef, useState } from 'react';
import type { Claim } from '../logic/claims';
import { money } from '../logic/format';
import { DEDUCTIONS, statementLines, YTD } from './SampleSettlementPage';
import { lift, map, shade } from './paperGeometry';
import { CAB_OVER, cabUri } from './sampleCab';

/** Room around the page on the canvas, for the shadow and the corner curl. */
const PAD = 40;
const COLS = 18;
/** Off-canvas distance for shapes drawn only for their shadow. */
const FAR = 10000;
const ROWS = 28;

export interface Statement {
  label: string;
  claims: Claim[];
  paid: Record<string, number>;
  highlight?: boolean;
}

/**
 * The sample page as a photograph of paper, not a drawing on the screen. The statement is
 * printed onto a bitmap (as a payroll printer would: Helvetica and Courier in toner), laid
 * onto the folded, tilted sheet (paperGeometry), lit fold by fold, softened like a phone
 * camera's lens, and given the sensor's grain, all on one canvas. Being a bitmap also lets
 * the glass bend it exactly as seen.
 */
export function SamplePaper({ statement, x, y, w, h, onReady }: { statement: Statement; x: number; y: number; w: number; h: number; onReady?: () => void }) {
  const out = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const key = JSON.stringify([statement.label, statement.highlight, statement.claims.map((c) => c.id), statement.paid]);

  useEffect(() => {
    const c = out.current;
    if (!c || w < 10 || h < 10) return;
    let gone = false;
    (async () => {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
      if (gone) return;
      const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
      const parent = c.parentElement;
      const seat = await photo();
      if (gone) return;
      const light = seat && parent ? lightOf(seat, parent.offsetWidth, parent.offsetHeight, x, y, w, h) : null;
      draw(c, printed(statement, w, h, scale), w, h, scale, light);
      setReady(true);
      onReady?.();
    })();
    return () => {
      gone = true;
    };
    // key stands for the statement's content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, x, y, w, h]);

  return (
    <canvas
      ref={out}
      aria-label={`Sample settlement statement, pay date ${statement.label}`}
      style={{ position: 'absolute', left: x - PAD, top: y - PAD, width: w + PAD * 2, height: h + PAD * 2, pointerEvents: 'none', opacity: ready ? 1 : 0, transition: 'opacity 120ms' }}
    />
  );
}

const SANS = 'Helvetica, Arial, sans-serif';
const MONO = '"Courier New", Courier, monospace';
const TONER = 'rgba(20,20,20,0.88)';
const fmt = (n: number) => (n < 0 ? `(${money(-n)})` : money(n));

/** The statement as it comes off the printer: flat, on a w × h page, at `scale`. */
function printed(st: Statement, w: number, h: number, scale: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  g.fillStyle = '#F5F3EE';
  g.fillRect(0, 0, w, h);
  const L = 14, R = w - 14;
  const cLoad = L + 2, cWhat = L + 40, cAmt = R - 2;
  let y = 22;
  g.fillStyle = TONER;
  g.textBaseline = 'alphabetic';
  g.font = `700 9px ${SANS}`;
  g.fillText('DRIVER SETTLEMENT STATEMENT', L, y);
  g.font = `7px ${SANS}`;
  g.fillText(`Pay date ${st.label}    Driver no. 20417    Direct deposit`, L, y + 10);
  const rule = (yy: number, a = 0.55) => {
    g.fillStyle = `rgba(20,20,20,${a})`;
    g.fillRect(L, yy, R - L, 0.75);
    g.fillStyle = TONER;
  };
  y += 18;
  rule(y);
  y += 7;
  // Column heads in a grey band, ruled above and below.
  g.fillStyle = 'rgba(20,20,20,0.07)';
  g.fillRect(L, y, R - L, 13);
  rule(y, 0.45);
  rule(y + 13, 0.45);
  g.font = `700 6.5px ${SANS}`;
  g.fillText('LOAD', cLoad, y + 9);
  g.fillText('DESCRIPTION', cWhat, y + 9);
  g.textAlign = 'right';
  g.fillText('AMOUNT', cAmt, y + 9);
  g.textAlign = 'left';
  y += 13;
  const ROW = 12;
  const line = (load: string, what: string, amt: string, bold = false, hit = false) => {
    if (hit) {
      g.fillStyle = '#D4F54C';
      g.fillRect(L, y + 1.5, R - L, ROW - 1);
      g.fillStyle = TONER;
    }
    g.font = `${bold ? '700 ' : ''}7.5px ${MONO}`;
    if (load) g.fillText(load, cLoad, y + 9);
    g.font = `${bold ? '700 ' : ''}7.5px ${SANS}`;
    g.fillText(what, cWhat, y + 9);
    g.font = `${bold ? '700 ' : ''}7.5px ${MONO}`;
    g.textAlign = 'right';
    g.fillText(amt, cAmt, y + 9);
    g.textAlign = 'left';
    y += ROW;
  };
  const { rows, net, miles } = statementLines(st.claims, st.paid);
  for (const r of rows) line(r.load, r.what, fmt(r.amt), false, !!st.highlight && r.what === 'Detention');
  y += 3;
  rule(y);
  y += 3;
  line('', 'Net pay', money(net), true);
  y += 2;
  rule(y);
  y += 3;
  line('', 'Paid miles this period', miles.toLocaleString('en-US'));
  y += 4;
  g.font = `700 6.5px ${SANS}`;
  g.fillText('DEDUCTIONS THIS PERIOD', L + 2, y + 6);
  y += 8;
  for (const [k, v] of DEDUCTIONS) line('', k, fmt(v));
  // Remarks, in small print, as statements carry.
  y += 6;
  g.font = `6px ${SANS}`;
  g.fillStyle = 'rgba(20,20,20,0.7)';
  for (const t of ['Accessorial pay (detention, layover) is paid on the settlement after the', 'paperwork is received. Questions about this settlement go to payroll', 'within 30 days of the pay date.']) {
    g.fillText(t, L + 2, y + 6);
    y += 8;
  }
  g.fillStyle = TONER;
  // The tear-off stub at the foot of the page.
  let fy = h - 14 - YTD.length * ROW - 14;
  g.setLineDash([3, 2]);
  g.strokeStyle = 'rgba(20,20,20,0.45)';
  g.lineWidth = 0.75;
  g.beginPath();
  g.moveTo(L, fy);
  g.lineTo(R, fy);
  g.stroke();
  g.setLineDash([]);
  fy += 4;
  g.font = `700 6.5px ${SANS}`;
  g.fillText('YEAR TO DATE', L + 2, fy + 6);
  y = fy + 8;
  for (const [k, v] of YTD) line('', k, fmt(v));
  return c;
}

function draw(c: HTMLCanvasElement, flat: HTMLCanvasElement, w: number, h: number, scale: number, light: Light | null) {
  const W = w + PAD * 2, H = h + PAD * 2;
  c.width = Math.round(W * scale);
  c.height = Math.round(H * scale);
  const g = c.getContext('2d');
  if (!g) return;
  const at = (u: number, v: number) => map(u, v, PAD, PAD, w, h);
  const outline = (k: CanvasRenderingContext2D) => {
    k.beginPath();
    for (let i = 0; i <= COLS; i++) k.lineTo(...at(i / COLS, 0));
    for (let j = 0; j <= ROWS; j++) k.lineTo(...at(1, j / ROWS));
    for (let i = COLS; i >= 0; i--) k.lineTo(...at(i / COLS, 1));
    for (let j = ROWS; j >= 0; j--) k.lineTo(...at(0, j / ROWS));
    k.closePath();
  };

  // 1. The paper on its own layer: the print laid onto the folded sheet, cell by cell (two
  //    affine triangles each, a hair overdrawn so no seams show), then lit.
  const p = document.createElement('canvas');
  p.width = c.width;
  p.height = c.height;
  const k = p.getContext('2d')!;
  k.setTransform(scale, 0, 0, scale, 0, 0);
  const fw = flat.width, fh = flat.height;
  const tri = (s: [number, number][], d: [number, number][]) => {
    const [[x0, y0], [x1, y1], [x2, y2]] = s;
    const [[u0, v0], [u1, v1], [u2, v2]] = d;
    const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3, gr = 1.015;
    const D = [[cx + (u0 - cx) * gr, cy + (v0 - cy) * gr], [cx + (u1 - cx) * gr, cy + (v1 - cy) * gr], [cx + (u2 - cx) * gr, cy + (v2 - cy) * gr]];
    const det = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
    if (!det) return;
    const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / det;
    const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / det;
    const cc = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / det;
    const dd = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / det;
    const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / det;
    const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / det;
    k.save();
    k.beginPath();
    k.moveTo(D[0][0], D[0][1]);
    k.lineTo(D[1][0], D[1][1]);
    k.lineTo(D[2][0], D[2][1]);
    k.closePath();
    k.clip();
    k.transform(a, b, cc, dd, e, f);
    k.drawImage(flat, 0, 0);
    k.restore();
  };
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const u0 = i / COLS, u1 = (i + 1) / COLS, v0 = j / ROWS, v1 = (j + 1) / ROWS;
      const s00: [number, number] = [u0 * fw, v0 * fh], s10: [number, number] = [u1 * fw, v0 * fh], s01: [number, number] = [u0 * fw, v1 * fh], s11: [number, number] = [u1 * fw, v1 * fh];
      const d00 = at(u0, v0), d10 = at(u1, v0), d01 = at(u0, v1), d11 = at(u1, v1);
      tri([s00, s10, s11], [d00, d10, d11]);
      tri([s00, s11, s01], [d00, d11, d01]);
    }
  }
  // Light, in fine bands: each bit of paper as bright as it faces the windshield. Gentle:
  // real paper in daylight shows its folds as a few percent, not as stripes.
  k.globalCompositeOperation = 'source-atop';
  const R2 = 180, C2 = 48;
  for (let j = 0; j < R2; j++) {
    for (let i = 0; i < C2; i++) {
      const u0 = i / C2, u1 = (i + 1) / C2, v0 = j / R2, v1 = (j + 1) / R2;
      const l = shade((u0 + u1) / 2, (v0 + v1) / 2) * 0.28;
      if (Math.abs(l) < 0.004) continue;
      k.fillStyle = l >= 0 ? `rgba(255,255,255,${l})` : `rgba(34,30,26,${-l})`;
      k.beginPath();
      k.moveTo(...at(u0, v0));
      k.lineTo(...at(u1, v0));
      k.lineTo(...at(u1, v1));
      k.lineTo(...at(u0, v1));
      k.closePath();
      k.fill();
    }
  }
  k.globalCompositeOperation = 'source-over';
  // The camera: a little soft, and the sensor's grain, on the paper only.
  const img = k.getImageData(0, 0, p.width, p.height);
  if (light) relight(img, light, scale);
  soften(img);
  const d = img.data;
  let seed = 11;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    seed = (seed * 16807) % 2147483647;
    const n = (seed / 2147483647 - 0.5) * 10;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  k.putImageData(img, 0, 0);

  // 2. Shadows on the seat. A sheet lying on a seat isn't held above it, so there's no drop
  //    shadow: only the thin dark line where its edge meets the fabric, a faint soft one
  //    around it (the paper blocks a little of the sky light), and real shadow only where
  //    the paper stands up: under the curled corner.
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.save();
  g.fillStyle = '#000';
  outline(g);
  g.shadowColor = 'rgba(10,12,18,0.16)';
  g.shadowBlur = 7;
  g.shadowOffsetY = 1.5;
  g.fill();
  g.shadowColor = 'rgba(10,12,18,0.42)';
  g.shadowBlur = 1.2;
  g.shadowOffsetY = 0.4;
  g.fill();
  g.restore();
  // Under the curl: the lifted corner's own outline, cast a little down and right, soft in
  // proportion to how high it stands.
  g.save();
  g.beginPath();
  const N = 10;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const u = 0.72 + (0.28 * i) / N, v = 0.8 + (0.2 * j) / N;
      const z = lift(u, v);
      if (z < 0.5) continue;
      const [px, py] = at(u, v);
      g.moveTo(px + z * 0.35 + z * 0.45 - FAR, py + z * 0.9);
      g.arc(px + z * 0.35 - FAR, py + z * 0.9, z * 0.45, 0, Math.PI * 2);
    }
  }
  // Drawn far off to the left and cast back by its shadow, so only the soft shadow lands
  // (shadowBlur works everywhere; ctx.filter doesn't in Safari).
  g.fillStyle = '#000';
  g.shadowColor = 'rgba(10,12,18,0.05)';
  g.shadowBlur = 3 * scale;
  g.shadowOffsetX = FAR * scale;
  g.fill();
  g.restore();
  g.save();
  g.globalCompositeOperation = 'destination-out';
  outline(g);
  g.fill();
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(p, 0, 0);
}

/** A light 3×3 blur on the opaque pixels: print photographed, not print on glass. */
function soften(img: ImageData) {
  const { width: W, height: H, data: d } = img;
  const src = new Uint8ClampedArray(d);
  const k = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const o = (y * W + x) * 4;
      if (src[o + 3] < 250) continue;
      for (let ch = 0; ch < 3; ch++) {
        let t = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const p = ((y + dy) * W + (x + dx)) * 4;
            if (src[p + 3] < 250) continue;
            const kk = k[(dy + 1) * 3 + (dx + 1)];
            t += src[p + ch] * kk;
            n += kk;
          }
        }
        if (n) d[o + ch] = t / n;
      }
    }
  }
}

/** The light on the seat where the page lies, as a blurred brightness map (linear). */
interface Light {
  map: Float32Array;
  mw: number;
  mh: number;
  /** Canvas points per map cell. */
  cell: number;
}

const LIN = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
});
const toSRGB = (l: number) => {
  const c = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
};

let seatPhoto: Promise<HTMLImageElement | null> | null = null;
function photo() {
  if (!seatPhoto) {
    const uri = cabUri();
    seatPhoto = uri
      ? new Promise((done) => {
          const im = new window.Image();
          // Decoded before use: WebKit can fire load and still draw nothing for a moment.
          im.onload = () => (im.decode ? im.decode().then(() => done(im), () => done(im)) : done(im));
          im.onerror = () => done(null);
          im.src = uri;
        })
      : Promise.resolve(null);
  }
  return seatPhoto;
}

/**
 * The seat photo's light under the page. The photo sits as it does on screen (cover, CAB_OVER
 * past each edge); this draws the part under the canvas, blurred wide so it keeps the light's
 * falloff and loses the weave, and keeps its brightness.
 */
function lightOf(im: HTMLImageElement, pw: number, ph: number, x: number, y: number, w: number, h: number): Light | null {
  if (!pw || !ph) return null;
  const cell = 4;
  const W = w + PAD * 2, H = h + PAD * 2;
  const mw = Math.ceil(W / cell), mh = Math.ceil(H / cell);
  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  const bw = pw * (1 + CAB_OVER * 2), bh = ph * (1 + CAB_OVER * 2);
  const s = Math.max(bw / im.naturalWidth, bh / im.naturalHeight);
  const ix = -pw * CAB_OVER + (bw - im.naturalWidth * s) / 2;
  const iy = -ph * CAB_OVER + (bh - im.naturalHeight * s) / 2;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.setTransform(1 / cell, 0, 0, 1 / cell, -(x - PAD) / cell, -(y - PAD) / cell);
  g.drawImage(im, ix, iy, im.naturalWidth * s, im.naturalHeight * s);
  const d = g.getImageData(0, 0, mw, mh).data;
  const map = new Float32Array(mw * mh);
  for (let i = 0; i < mw * mh; i++) map[i] = 0.2126 * LIN[d[i * 4]] + 0.7152 * LIN[d[i * 4 + 1]] + 0.0722 * LIN[d[i * 4 + 2]];
  // Blurred here, not with the canvas's filter: Safari ignores ctx.filter, and the weave
  // would come through as blocky noise on the page. Three box passes each way are about
  // a gaussian of ~20pt: the light's falloff stays, the fabric's texture goes.
  blur(map, mw, mh, 3);
  blur(map, mw, mh, 3);
  blur(map, mw, mh, 3);
  // If the photo didn't draw (blank map), leave the paper unlit rather than black.
  let lo = Infinity;
  for (let i = 0; i < map.length; i++) lo = Math.min(lo, map[i]);
  if (!(lo > 0.02)) return null;
  return { map, mw, mh, cell };
}

/** One box-blur pass of radius r, across then down, clamped at the edges. */
function blur(m: Float32Array, w: number, h: number, r: number) {
  const t = new Float32Array(m.length);
  const n = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let k = -r; k <= r; k++) a += m[y * w + Math.max(0, Math.min(w - 1, x + k))];
      t[y * w + x] = a / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let k = -r; k <= r; k++) a += t[Math.max(0, Math.min(h - 1, y + k)) * w + x];
      m[y * w + x] = a / n;
    }
  }
}

/**
 * Light the paper with the seat's own light. The seat's fabric reflects about this much;
 * dividing its brightness by that gives the light falling there, and the paper, reflecting
 * far more, shows that light at its own whiteness. So the page is exactly as bright as white
 * paper would be in that photo, brighter toward the windshield and dimmer toward the back,
 * and never a white cut-out laid over a grey picture. The tint is daylight's, a hair cool.
 */
const FABRIC = 0.43;
const TINT = [0.975, 1, 1.03];
function relight(img: ImageData, L: Light, scale: number) {
  const { width: W, height: H, data: d } = img;
  const per = scale * L.cell;
  // Smoothly between map cells, so the light has no steps.
  const at = (fx: number, fy: number) => {
    const x0 = Math.max(0, Math.min(L.mw - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(L.mh - 1, Math.floor(fy)));
    const x1 = Math.min(L.mw - 1, x0 + 1), y1 = Math.min(L.mh - 1, y0 + 1);
    const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
    const m = L.map, r0 = y0 * L.mw, r1 = y1 * L.mw;
    return (m[r0 + x0] * (1 - tx) + m[r0 + x1] * tx) * (1 - ty) + (m[r1 + x0] * (1 - tx) + m[r1 + x1] * tx) * ty;
  };
  for (let py = 0; py < H; py++) {
    const fy = py / per - 0.5;
    for (let px = 0; px < W; px++) {
      const o = (py * W + px) * 4;
      if (d[o + 3] === 0) continue;
      const e = at(px / per - 0.5, fy) / FABRIC;
      d[o] = toSRGB(LIN[d[o]] * e * TINT[0]);
      d[o + 1] = toSRGB(LIN[d[o + 1]] * e * TINT[1]);
      d[o + 2] = toSRGB(LIN[d[o + 2]] * e * TINT[2]);
    }
  }
}
